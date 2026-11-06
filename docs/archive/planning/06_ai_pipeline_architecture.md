# ResearchReel — Production AI Pipeline & Workflow Architecture

This document specifies the AI pipelines powering ResearchReel V1.0 Enterprise, detailing the systems for RAG-based document interrogation, script drafting, vocal synthesis, and FFmpeg video transcoding.

---

## 1. Pipeline Diagram & Architecture Overview

```text
                        Uploaded PDF
                             │
                      [PDF Parser] (Grobid / PyMuPDF)
                             │
                      [Chunking Engine] (Recursive)
                             │
                    [Embedding Generator] (text-embedding-3-large)
                             │
                       [Vector Store] (Qdrant)
                             │
       ┌─────────────────────┴─────────────────────┐
       ▼                                           ▼
[RAG Engine] (Gemini 1.5 Pro)              [Script Generator] (Gemini 1.5 Flash)
       │                                           │
  Chat Q&A Output                            Scene JSON Plan
                                                   │
                                            ┌──────┴──────┐
                                            ▼             ▼
                                     [Speech Synth]  [Slide Maker] (FFmpeg)
                                     (Edge-TTS / TTS)     │
                                            │             │
                                            └──────┬──────┘
                                                   ▼
                                          [Transcoding Engine] (FFmpeg)
                                                   │
                                              HLS Stream
```

---

## 2. Pipeline Execution Stages

### 2.1 Research & Parsing Engine
* **Input**: Raw PDF binary uploaded to the workspace.
* **Output**: Paragraph chunks, abstract, metadata JSON, and document summary.
* **Models**: Grobid (structural layout mapping) + PyMuPDF (text/image extraction).
* **Prompt (Metadata extraction)**:
  `Extract academic authors, title, publication date, abstract, and DOI from the following text block: {text}`
* **Fallback**: Raw PDF text extraction without structure mapping if Grobid fails.
* **Caching**: MD5 file hash lookup in Postgres. If present, returns existing parse IDs.
* **Queue Design**: Files are placed in a Redis-backed BullMQ queue `pdf-parsing-jobs` to run asynchronously.

### 2.2 Vector Embedding & Storage
* **Input**: Structural paragraph text chunks.
* **Output**: 1536-dimensional float vector array.
* **Models**: `text-embedding-3-large` (dimension mapping constrained to 1536).
* **Caching**: Text segments are hashed using SHA-256. Existing hashes bypass API calls.
* **Cost Optimization**: Chunks containing only headers, references, or formulas are excluded from embedding calls.

### 2.3 AI Script Synthesizer
* **Input**: Top-5 document text chunks retrieved from Qdrant matching user query.
* **Output**: Structured JSON document outlining a 4-scene video script with captions and scene visuals descriptions.
* **Models**: Gemini 1.5 Flash.
* **System Prompt**:
  ```text
  You are an expert scientific communicator. Create a 40-second vertical video script summarizing the key findings of the attached research.
  Return only a JSON object adhering to this schema:
  {
    "title": "Short title",
    "scenes": [
      {
        "scene_number": 1,
        "narration": "Introductory hook",
        "caption": "Short subtitle text",
        "visual_prompt": "Prompt for image/video backgrounds"
      }
    ]
  }
  ```
* **Fallback Model**: Llama 3.1 8B hosted on internal GPU workers.

### 2.4 Voice Generation (Speech Synthesis)
* **Input**: `narration` text field for each scene.
* **Output**: `.mp3` audio files containing vocal narrations.
* **Models**: Edge-TTS (Edge Web TTS APIs).
* **Accents Supported**: `en-US-GuyNeural`, `en-US-AriaNeural`, `en-GB-ThomasNeural`.
* **Caching**: Audio files are indexed in Redis using MD5 hashes of the input text and voice settings.

### 2.5 Video Composition & Transcoding
* **Input**: Vocal narration MP3s, visual asset URLs, and scene transition details.
* **Output**: Transcoded multi-bitrate HLS output files (`.m3u8` playlist files + TS chunks).
* **Pipeline tool**: FFmpeg wrapper running on GPU worker instances (e.g. AWS G5).
* **Transcoding script logic**:
  * Generate subtitle files (WebVTT format) using narration durations.
  * Image inputs are scaled to 1080x1920 (9:16 aspect ratio).
  * Video segments are stitched, overlaying subtitles, vocal narrations, and background audio loops.
  * Transcodes files to multiple bitrates (360p, 480p, 720p, 1080p).
* **Queue Design**: Multi-concurrency BullMQ instance (`video-rendering-jobs`) pulling from Redis cluster.
* **Monitoring**: Prometheus tracks average render times (duration target: < 45 seconds per reel) and transcoding failure counts.
