/**
 * Vision Worker - Facial Emotion Recognition using ONNX Runtime Web
 * 
 * This worker runs in a separate thread to avoid blocking the main UI.
 * It uses ONNX Runtime Web to run the FER+ (Facial Emotion Recognition) model.
 * 
 * PRIVACY: All processing happens locally. No data is sent to any server.
 * 
 * Model: FER+ (Facial Expression Recognition Plus)
 * - Input: 64x64 grayscale image
 * - Output: 8 emotion probabilities
 */

import * as ort from 'onnxruntime-web';

// Emotion labels from FER+ model
const EMOTION_LABELS = [
    'neutral',
    'happiness',
    'surprise',
    'sadness',
    'anger',
    'disgust',
    'fear',
    'contempt'
] as const;

// Model configuration
const MODEL_INPUT_SIZE = 64;
const MODEL_PATH = '/models/emotion-ferplus-8.onnx';

// Worker state
let session: ort.InferenceSession | null = null;
let isInitialized = false;
let executionProvider: 'webgpu' | 'wasm' = 'wasm';

/**
 * Initialize the ONNX Runtime session
 */
async function initializeModel(): Promise<void> {
    if (isInitialized) return;

    try {
        // Try WebGPU first, fall back to WASM
        const providers: ort.InferenceSession.ExecutionProviderConfig[] = [];

        // Check if WebGPU is available
        if ('gpu' in navigator) {
            try {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const adapter = await (navigator as any).gpu?.requestAdapter();
                if (adapter) {
                    providers.push('webgpu');
                    executionProvider = 'webgpu';
                }
            } catch {
                // WebGPU not available
            }
        }

        // Always add WASM as fallback
        providers.push('wasm');

        // Configure ONNX Runtime
        ort.env.wasm.numThreads = navigator.hardwareConcurrency || 4;
        ort.env.wasm.simd = true;

        // Create inference session
        session = await ort.InferenceSession.create(MODEL_PATH, {
            executionProviders: providers,
            graphOptimizationLevel: 'all',
        });

        isInitialized = true;

        self.postMessage({
            type: 'initialized',
            executionProvider,
            modelPath: MODEL_PATH,
        });

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        self.postMessage({
            type: 'error',
            error: `Failed to initialize model: ${errorMessage}`,
        });
    }
}

/**
 * Preprocess image data for the FER+ model
 * - Resize to 64x64
 * - Convert to grayscale
 * - Normalize to [-1, 1]
 */
function preprocessImage(imageData: ImageData): Float32Array {
    const { data, width, height } = imageData;

    // Create output tensor (1 x 1 x 64 x 64)
    const tensor = new Float32Array(MODEL_INPUT_SIZE * MODEL_INPUT_SIZE);

    // Scale factors
    const scaleX = width / MODEL_INPUT_SIZE;
    const scaleY = height / MODEL_INPUT_SIZE;

    for (let y = 0; y < MODEL_INPUT_SIZE; y++) {
        for (let x = 0; x < MODEL_INPUT_SIZE; x++) {
            // Source pixel (using nearest neighbor for speed)
            const srcX = Math.floor(x * scaleX);
            const srcY = Math.floor(y * scaleY);
            const srcIdx = (srcY * width + srcX) * 4;

            // Convert to grayscale (luminance formula)
            const r = data[srcIdx] ?? 0;
            const g = data[srcIdx + 1] ?? 0;
            const b = data[srcIdx + 2] ?? 0;
            const gray = 0.299 * r + 0.587 * g + 0.114 * b;

            // Normalize to [-1, 1]
            const normalized = (gray / 127.5) - 1;

            // Store in tensor
            tensor[y * MODEL_INPUT_SIZE + x] = normalized;
        }
    }

    return tensor;
}

/**
 * Run emotion inference on preprocessed image
 */
async function runInference(imageData: ImageData): Promise<void> {
    if (!session) {
        self.postMessage({
            type: 'error',
            error: 'Model not initialized',
        });
        return;
    }

    try {
        // Preprocess
        const inputTensor = preprocessImage(imageData);

        // Create ONNX tensor (batch=1, channels=1, height=64, width=64)
        const tensor = new ort.Tensor('float32', inputTensor, [1, 1, MODEL_INPUT_SIZE, MODEL_INPUT_SIZE]);

        // Run inference
        const feeds: Record<string, ort.Tensor> = { Input3: tensor };
        const results = await session.run(feeds);

        // Get output probabilities
        const output = results['Plus692_Output_0'];
        if (!output) {
            throw new Error('No output from model');
        }

        const scores = output.data as Float32Array;

        // Apply softmax to get probabilities
        const probabilities = softmax(Array.from(scores));

        // Find dominant emotion
        let maxIdx = 0;
        let maxScore = probabilities[0] ?? 0;
        for (let i = 1; i < probabilities.length; i++) {
            if ((probabilities[i] ?? 0) > maxScore) {
                maxScore = probabilities[i] ?? 0;
                maxIdx = i;
            }
        }

        // Create emotion vector
        const emotionVector: Record<string, number> = {};
        EMOTION_LABELS.forEach((label, idx) => {
            emotionVector[label] = probabilities[idx] ?? 0;
        });

        // Send results back to main thread
        self.postMessage({
            type: 'result',
            emotionVector,
            dominantEmotion: EMOTION_LABELS[maxIdx],
            confidence: maxScore,
            timestamp: Date.now(),
        });

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        self.postMessage({
            type: 'error',
            error: `Inference failed: ${errorMessage}`,
        });
    }
}

/**
 * Softmax function for probability normalization
 */
function softmax(scores: number[]): number[] {
    const maxScore = Math.max(...scores);
    const expScores = scores.map(s => Math.exp(s - maxScore));
    const sumExp = expScores.reduce((a, b) => a + b, 0);
    return expScores.map(e => e / sumExp);
}

// Handle messages from main thread
self.onmessage = async (event: MessageEvent) => {
    const { type, imageData } = event.data;

    switch (type) {
        case 'init':
            await initializeModel();
            break;

        case 'process':
            if (!isInitialized) {
                await initializeModel();
            }
            if (imageData) {
                await runInference(imageData);
            }
            break;

        case 'terminate':
            if (session) {
                // Clean up
                session = null;
                isInitialized = false;
            }
            break;

        default:
            console.warn('[VisionWorker] Unknown message type:', type);
    }
};

// Export for TypeScript (worker context)
export { };
