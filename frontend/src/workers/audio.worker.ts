/**
 * Audio Worker - Speech Emotion Recognition using Transformers.js
 * 
 * PRIVACY: All processing happens locally. No data is sent to any server.
 * 
 * Model: Wav2Vec2 fine-tuned for speech emotion recognition
 * - Input: Raw audio samples (16kHz)
 * - Output: Emotion classification with probabilities
 */

import { pipeline, env } from '@huggingface/transformers';

// Configure Transformers.js for browser
env.allowLocalModels = true;  // Allow loading from local path
env.useBrowserCache = true;

// Emotion labels for speech
const SPEECH_EMOTION_LABELS = [
    'angry',
    'calm',
    'disgust',
    'fearful',
    'happy',
    'neutral',
    'sad',
    'surprised'
] as const;

// Map speech emotions to our standard emotion vector
const EMOTION_MAPPING: Record<string, string> = {
    'angry': 'anger',
    'calm': 'neutral',
    'disgust': 'disgust',
    'fearful': 'fear',
    'happy': 'happiness',
    'neutral': 'neutral',
    'sad': 'sadness',
    'surprised': 'surprise',
};

// Model configuration - Try local first, then remote
const MODEL_ID = 'Xenova/wav2vec2-lg-xlsr-en-speech-emotion-recognition';

// Worker state
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let classifier: any = null;
let isInitialized = false;
let isInitializing = false;

// Audio buffer for accumulating samples
let audioBuffer: Float32Array[] = [];
let sampleRate = 16000;
const MIN_AUDIO_LENGTH = 16000; // 1 second of audio at 16kHz

/**
 * Initialize the Transformers.js pipeline
 */
async function initializeModel(): Promise<void> {
    if (isInitialized || isInitializing) return;

    isInitializing = true;

    try {
        self.postMessage({
            type: 'status',
            status: 'loading',
            message: 'Loading speech emotion model... (this may take a minute on first load)',
        });

        // Create audio classification pipeline
        // Model will be cached in browser's IndexedDB after first download
        classifier = await pipeline('audio-classification', MODEL_ID, {
            device: 'wasm',
            dtype: 'fp32',
            progress_callback: (progress: { status: string; progress?: number }) => {
                if (progress.progress) {
                    self.postMessage({
                        type: 'status',
                        status: 'loading',
                        message: `Downloading audio model: ${Math.round(progress.progress)}%`,
                    });
                }
            },
        });

        isInitialized = true;
        isInitializing = false;

        self.postMessage({
            type: 'initialized',
            modelId: MODEL_ID,
        });

    } catch (error) {
        isInitializing = false;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('[AudioWorker] Model initialization failed:', errorMessage);

        // Send more helpful error message
        self.postMessage({
            type: 'error',
            error: `Audio model failed to load. This may be due to network issues. The app will work with facial emotion only. Error: ${errorMessage}`,
        });
    }
}

/**
 * Concatenate audio buffers into a single Float32Array
 */
function concatenateBuffers(buffers: Float32Array[]): Float32Array {
    const totalLength = buffers.reduce((sum, buf) => sum + buf.length, 0);
    const result = new Float32Array(totalLength);

    let offset = 0;
    for (const buffer of buffers) {
        result.set(buffer, offset);
        offset += buffer.length;
    }

    return result;
}

/**
 * Resample audio if needed (simple linear interpolation)
 */
function resampleAudio(audio: Float32Array, fromRate: number, toRate: number): Float32Array {
    if (fromRate === toRate) return audio;

    const ratio = fromRate / toRate;
    const newLength = Math.floor(audio.length / ratio);
    const result = new Float32Array(newLength);

    for (let i = 0; i < newLength; i++) {
        const srcIndex = i * ratio;
        const srcIndexFloor = Math.floor(srcIndex);
        const srcIndexCeil = Math.min(srcIndexFloor + 1, audio.length - 1);
        const t = srcIndex - srcIndexFloor;

        result[i] = (audio[srcIndexFloor] ?? 0) * (1 - t) + (audio[srcIndexCeil] ?? 0) * t;
    }

    return result;
}

/**
 * Run emotion classification on audio
 */
async function runInference(audioData: Float32Array, inputSampleRate: number): Promise<void> {
    if (!classifier) {
        // Silently skip if model not loaded - face-only mode
        return;
    }

    try {
        // Resample to 16kHz if needed
        let processedAudio = audioData;
        if (inputSampleRate !== 16000) {
            processedAudio = resampleAudio(audioData, inputSampleRate, 16000);
        }

        // Run classification
        const results = await classifier(processedAudio, {
            topk: SPEECH_EMOTION_LABELS.length,
        });

        // Process results
        const emotionVector: Record<string, number> = {
            neutral: 0,
            happiness: 0,
            sadness: 0,
            anger: 0,
            fear: 0,
            surprise: 0,
            disgust: 0,
            contempt: 0,
        };

        let dominantEmotion = 'neutral';
        let maxScore = 0;

        // Map speech emotions to our standard format
        if (Array.isArray(results)) {
            for (const result of results) {
                const speechLabel = result.label?.toLowerCase() ?? '';
                const mappedLabel = EMOTION_MAPPING[speechLabel] ?? 'neutral';
                const score = result.score ?? 0;

                emotionVector[mappedLabel] = (emotionVector[mappedLabel] ?? 0) + score;

                if (score > maxScore) {
                    maxScore = score;
                    dominantEmotion = mappedLabel;
                }
            }
        }

        // Normalize to ensure sum = 1
        const total = Object.values(emotionVector).reduce((a, b) => a + b, 0);
        if (total > 0) {
            for (const key of Object.keys(emotionVector)) {
                emotionVector[key] = (emotionVector[key] ?? 0) / total;
            }
        }

        // Send results back to main thread
        self.postMessage({
            type: 'result',
            emotionVector,
            dominantEmotion,
            confidence: maxScore,
            timestamp: Date.now(),
        });

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        self.postMessage({
            type: 'error',
            error: `Audio inference failed: ${errorMessage}`,
        });
    }
}

/**
 * Add audio chunk to buffer and process when enough data is available
 */
async function processAudioChunk(chunk: Float32Array, chunkSampleRate: number): Promise<void> {
    sampleRate = chunkSampleRate;
    audioBuffer.push(chunk);

    // Calculate total samples
    const totalSamples = audioBuffer.reduce((sum, buf) => sum + buf.length, 0);

    // Process when we have at least 1 second of audio
    if (totalSamples >= MIN_AUDIO_LENGTH) {
        const fullAudio = concatenateBuffers(audioBuffer);
        audioBuffer = []; // Clear buffer

        await runInference(fullAudio, sampleRate);
    }
}

// Handle messages from main thread
self.onmessage = async (event: MessageEvent) => {
    const { type, audioData, sampleRate: inputSampleRate } = event.data;

    switch (type) {
        case 'init':
            await initializeModel();
            break;

        case 'process':
            if (!isInitialized && !isInitializing) {
                await initializeModel();
            }
            if (audioData && isInitialized) {
                await processAudioChunk(audioData, inputSampleRate || 16000);
            }
            break;

        case 'flush':
            // Process remaining audio in buffer
            if (audioBuffer.length > 0 && isInitialized) {
                const fullAudio = concatenateBuffers(audioBuffer);
                audioBuffer = [];
                if (fullAudio.length > 0) {
                    await runInference(fullAudio, sampleRate);
                }
            }
            break;

        case 'terminate':
            classifier = null;
            isInitialized = false;
            audioBuffer = [];
            break;

        default:
            console.warn('[AudioWorker] Unknown message type:', type);
    }
};

// Export for TypeScript
export { };
