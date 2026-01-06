# neurodiverse-assistant
A Professional AI Assistant for neurodivergent professionals (ADHD, autism, social anxiety) to navigate workplace communication through real-time multimodal analysis while maintaining strict privacy through on-device processing.

Project NeuroBridge: AI Social Co-Pilot

Overview

Project NeuroBridge is a professional-grade, privacy-preserving AI assistant designed for neurodivergent professionals (ADHD, ASD, Social Anxiety). It provides real-time multimodal social cues (facial expressions, vocal prosody, and sentiment) to assist in workplace communication.

Core Philosophy: - Privacy First: Raw audio/video never leaves the device.

Local Inference: Machine Learning runs in the browser via WebGPU/WASM.

Neuro-Inclusive: Designed for cognitive accessibility and reduced social masking.

Tech Stack

Backend: Python 3.11+, Django 5.0, Django Channels (WebSockets).

Database: PostgreSQL (with JSONB for encrypted metadata).

Caching/Real-time: Redis.

Frontend: React 18, TypeScript, TailwindCSS, Zustand (State Management).

Machine Learning: ONNX Runtime Web, Transformers.js.

Hardware Acceleration: WebGPU (fallback to WASM).

Architectural Blueprint

The project follows a Hybrid Local-First Pattern:

1. The Inference Zone (Client-Side)

Vision Worker: Runs Emotion-FERPlus for facial emotion recognition.

Audio Worker: Runs Wav2Vec2 for speech emotion recognition (SER).

Fusion Logic: Combines streams to detect conflicts (e.g., sarcasm detection).

2. The Orchestration Zone (Server-Side)

Django Channels: Manages persistent WebSocket connections for real-time state sync.

Privacy Layer: The server only stores Client-Side Encrypted (AES-GCM) metadata. It acts as a "Zero-Knowledge" storage plane.

Implementation Phases (The Learning Journey)

Phase 1: The Foundation (Backend & Infrastructure)

[ ] Initialize Django project with a custom User model.

[ ] Configure Docker environment (Postgres, Redis, Django, Vite).

[ ] Implement JWT authentication and basic REST endpoints for "Sessions."

[ ] Set up Django Channels and a NeuroBridgeConsumer for real-time messaging.

Phase 2: The Edge Compute (Frontend & Web Workers)

[ ] Scaffold React app with Vite and TypeScript.

[ ] Implement useMediaStream hook with strict privacy controls.

[ ] Build the Web Worker architecture:

vision.worker.ts (ONNX Runtime initialization).

audio.worker.ts (Transformers.js pipeline).

[ ] Create the "Kill Switch" and hardware status indicators.

Phase 3: The Intelligence (Model Integration & Fusion)

[ ] Implement WebGPU-accelerated inference for FER (Facial Emotion Recognition).

[ ] Set up Audio buffering and prosody analysis.

[ ] Write the Fusion Algorithm: Weighted average of emotion vectors + conflict detection logic.

Phase 4: The Experience (HUD & Calm UI)

[ ] Design an "Ambient HUD" that uses soft color shifts instead of intrusive text.

[ ] Implement "Topic Anchoring" to help ADHD users re-engage.

[ ] Add client-side encryption for session summaries using the Web Crypto API.

Instructions for AI Assistant (The Master Prompt)

When building this project, please follow these strict rules:

Code Quality: Write clean, modular TypeScript and Python. Use type hints and interfaces.

Privacy Guardrails: Ensure no raw media data is ever sent to the backend. All fetch or socket.send calls must only contain processed metadata.

Explanatory Building: As you generate code, explain the "Why" behind architectural decisions (e.g., why we use Web Workers for inference or Redis for the Channel Layer).

Recruiter Ready: Focus on performance optimizations (WebGPU, memory management for tensors) and security (encryption at rest).

Directory Structure

/neurobridge
├── /backend
│   ├── /apps/core        # Custom User & Auth
│   ├── /apps/sessions    # Session metadata & history
│   ├── /apps/stream      # WebSocket Consumers
│   └── manage.py
├── /frontend
│   ├── /src/workers      # Vision, Audio, & Fusion workers
│   ├── /src/hooks        # useMediaStream, useInference
│   ├── /src/stores       # Zustand (State management)
│   └── /public/models    # ONNX model assets
└── docker-compose.yml


Ethics & Bias

This tool is an assistant, not an arbiter of truth. We prioritize transparency, allowing users to see when the system is active and ensuring models are calibrated to the user's personal baseline to account for neurodivergent expression patterns.