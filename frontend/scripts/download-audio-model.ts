/**
 * Pre-download Transformers.js models for offline use
 * 
 * Run this with: npx ts-node scripts/download-audio-model.ts
 * Or: node --loader ts-node/esm scripts/download-audio-model.ts
 * 
 * This downloads the Wav2Vec2 speech emotion model to the browser's cache
 * so it doesn't need to be downloaded at runtime.
 */

// This script is meant to be run in the browser console or as documentation
// Transformers.js caches models in IndexedDB automatically

console.log(`
=====================================================
  Pre-download Audio Model Instructions
=====================================================

OPTION 1: Use Browser Cache (Recommended)
------------------------------------------
The model automatically caches in IndexedDB after first download.
Just refresh the page after the initial download completes.

OPTION 2: Manual Download for Air-gapped Systems
-------------------------------------------------
If you need truly offline access, you can:

1. Visit: https://huggingface.co/Xenova/wav2vec2-lg-xlsr-en-speech-emotion-recognition/tree/main
2. Download the following files:
   - config.json
   - preprocessor_config.json  
   - model.onnx (or model_quantized.onnx for smaller size)
   - tokenizer.json (if available)

3. Place them in: frontend/public/models/wav2vec2-emotion/

4. Update audio.worker.ts to use local path:
   const MODEL_ID = '/models/wav2vec2-emotion';

OPTION 3: Use a Different/Smaller Model
----------------------------------------
If you want a smaller model, you can try:
- distilhubert (smaller but less accurate)
- Update MODEL_ID in audio.worker.ts

Current Model Size: ~300MB (downloaded once, cached in browser)
=====================================================
`);
