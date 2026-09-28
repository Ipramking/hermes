/**
 * Runs entirely inside a Web Worker: loads a small Whisper speech-recognition
 * model once (cached by the browser after the first download) and
 * transcribes short audio clips on request. This is the universal fallback
 * path - it only needs WebAssembly and a microphone, so it works in Firefox,
 * Safari, and everywhere else Chrome's native SpeechRecognition doesn't
 * exist. Kept off the main thread so a few seconds of inference never
 * freezes the UI.
 */
import { pipeline, env } from "@xenova/transformers";

// This app has no model files of its own to serve - let transformers.js pull
// the (cached-after-first-use) model and WASM runtime from its normal CDN.
env.allowLocalModels = false;

type InMessage = { type: "transcribe"; audio: Float32Array };
type OutMessage =
  | { type: "progress"; progress: number }
  | { type: "ready" }
  | { type: "result"; text: string }
  | { type: "error"; message: string };

const ctx = self as unknown as Worker;

function post(msg: OutMessage): void {
  ctx.postMessage(msg);
}

let recognizerPromise: Promise<any> | null = null;

function getRecognizer(): Promise<any> {
  if (!recognizerPromise) {
    recognizerPromise = pipeline("automatic-speech-recognition", "Xenova/whisper-tiny.en", {
      quantized: true,
      progress_callback: (p: { status?: string; progress?: number }) => {
        if (p?.status === "progress" && typeof p.progress === "number") {
          post({ type: "progress", progress: p.progress });
        }
      },
    }).then((pipe) => {
      post({ type: "ready" });
      return pipe;
    });
  }
  return recognizerPromise;
}

ctx.onmessage = async (event: MessageEvent<InMessage>) => {
  const msg = event.data;
  if (msg.type !== "transcribe") return;
  try {
    const recognizer = await getRecognizer();
    const output = await recognizer(msg.audio, { language: "english", task: "transcribe" });
    const text = Array.isArray(output) ? (output[0]?.text ?? "") : (output?.text ?? "");
    post({ type: "result", text: String(text) });
  } catch (err) {
    post({ type: "error", message: err instanceof Error ? err.message : String(err) });
  }
};
