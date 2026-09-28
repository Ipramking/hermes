/**
 * The universal voice-command path: works in any browser with a microphone,
 * not just Chrome. Records a short clip via MediaRecorder + getUserMedia,
 * resamples it to 16kHz mono, and hands it to a Whisper model running in a
 * Web Worker (whisperWorker.ts, via @xenova/transformers) for transcription
 * - all client-side, no server, no API key.
 *
 * useVoice.ts only reaches for this when isNativeRecognitionSupported() is
 * false, so Chrome/Edge keep using the faster native streaming recognizer
 * and never pay for this module or the model download.
 */
import { parseCommand, speak, type VoiceCommand, type VoiceListener } from "./voice.js";

const MAX_RECORD_MS = 6000;
const TARGET_SAMPLE_RATE = 16000;

type WorkerOutMessage =
  | { type: "progress"; progress: number }
  | { type: "ready" }
  | { type: "result"; text: string }
  | { type: "error"; message: string };

let sharedWorker: Worker | null = null;
function getWorker(): Worker {
  if (!sharedWorker) {
    sharedWorker = new Worker(new URL("./whisperWorker.ts", import.meta.url), { type: "module" });
  }
  return sharedWorker;
}

export class WhisperVoiceListener implements VoiceListener {
  private stream: MediaStream | null = null;
  private recorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private stopRequested = false;
  private announcedSetup = false;

  constructor(
    private onCommand: (command: VoiceCommand | null, transcript: string) => void,
    private onStateChange: (listening: boolean) => void,
    private onError?: (message: string) => void
  ) {}

  start(): void {
    this.stopRequested = false;
    void this.record();
  }

  stop(): void {
    this.stopRequested = true;
    if (this.recorder && this.recorder.state === "recording") this.recorder.stop();
  }

  private async record(): Promise<void> {
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      this.onError?.("Microphone access was denied.");
      return;
    }
    if (this.stopRequested) {
      stream.getTracks().forEach((t) => t.stop());
      return;
    }
    this.stream = stream;

    const mimeType = ["audio/webm", "audio/ogg", "audio/mp4"].find((t) => MediaRecorder.isTypeSupported(t));
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    this.recorder = recorder;
    this.chunks = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.chunks.push(e.data);
    };

    const stopped = new Promise<void>((resolve) => {
      recorder.onstop = () => resolve();
    });

    recorder.start();
    this.onStateChange(true);
    const maxTimer = window.setTimeout(() => {
      if (recorder.state === "recording") recorder.stop();
    }, MAX_RECORD_MS);

    await stopped;
    window.clearTimeout(maxTimer);
    this.stream.getTracks().forEach((t) => t.stop());
    this.stream = null;

    const blob = new Blob(this.chunks, { type: recorder.mimeType });
    this.chunks = [];

    if (blob.size === 0) {
      this.onStateChange(false);
      return;
    }

    try {
      const audio = await decodeTo16kMono(blob);
      // Small models tend to hallucinate text on near-silent clips - skip the
      // (comparatively expensive) transcription pass entirely when nothing
      // was actually said, rather than reporting a bogus command.
      if (!hasSpeech(audio)) {
        this.onCommand(null, "");
        return;
      }
      const text = await this.transcribe(audio);
      this.onCommand(parseCommand(text), text);
    } catch {
      this.onError?.("Voice recognition had trouble understanding that. Try again.");
    } finally {
      this.onStateChange(false);
    }
  }

  private transcribe(audio: Float32Array): Promise<string> {
    return new Promise((resolve, reject) => {
      const worker = getWorker();
      if (!this.announcedSetup) {
        this.announcedSetup = true;
        speak("One moment, setting up voice recognition for this browser.");
      }
      const onMessage = (event: MessageEvent<WorkerOutMessage>) => {
        const msg = event.data;
        if (msg.type === "result") {
          worker.removeEventListener("message", onMessage);
          resolve(msg.text);
        } else if (msg.type === "error") {
          worker.removeEventListener("message", onMessage);
          reject(new Error(msg.message));
        }
      };
      worker.addEventListener("message", onMessage);
      worker.postMessage({ type: "transcribe", audio });
    });
  }
}

function hasSpeech(audio: Float32Array, threshold = 0.01): boolean {
  let sumSquares = 0;
  for (let i = 0; i < audio.length; i++) sumSquares += audio[i] * audio[i];
  return Math.sqrt(sumSquares / audio.length) > threshold;
}

async function decodeTo16kMono(blob: Blob): Promise<Float32Array> {
  const arrayBuffer = await blob.arrayBuffer();
  const AudioCtx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const decodeCtx = new AudioCtx();
  const decoded = await decodeCtx.decodeAudioData(arrayBuffer);
  await decodeCtx.close();

  if (decoded.sampleRate === TARGET_SAMPLE_RATE && decoded.numberOfChannels === 1) {
    return decoded.getChannelData(0);
  }

  const offline = new OfflineAudioContext(1, Math.ceil(decoded.duration * TARGET_SAMPLE_RATE), TARGET_SAMPLE_RATE);
  const source = offline.createBufferSource();
  source.buffer = decoded;
  source.connect(offline.destination);
  source.start();
  const rendered = await offline.startRendering();
  return rendered.getChannelData(0);
}
