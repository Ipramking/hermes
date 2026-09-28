/**
 * Voice layer for EchoPay: browser text-to-speech (SpeechSynthesis) and
 * voice-command navigation (SpeechRecognition). Unlike the rest of core/,
 * this module is web-only - there is no cross-platform equivalent yet, and
 * command recognition today is reliably supported only in Chrome.
 */

export type TabTarget = "home" | "dashboard" | "chat" | "transact" | "services";
export type DetailTarget = "score" | "security" | "profile";

export type VoiceCommand =
  | { type: "nav"; tab: TabTarget }
  | { type: "detail"; detail: DetailTarget }
  | { type: "transfer" }
  | { type: "back" }
  | { type: "read" }
  | { type: "stop" }
  | { type: "help" };

type Rule = { phrases: string[]; command: VoiceCommand };

const RULES: Rule[] = [
  { phrases: ["go home", "home screen", "take me home", "open home", "home"], command: { type: "nav", tab: "home" } },
  { phrases: ["dashboard", "open dashboard", "show dashboard", "spending"], command: { type: "nav", tab: "dashboard" } },
  { phrases: ["talk to echo", "open echo", "open assistant", "open chat", "assistant", "chat"], command: { type: "nav", tab: "chat" } },
  { phrases: ["open transact", "transactions", "transact"], command: { type: "nav", tab: "transact" } },
  { phrases: ["open services", "show services", "services"], command: { type: "nav", tab: "services" } },
  { phrases: ["send money", "new transfer", "start a transfer", "make a transfer", "transfer money"], command: { type: "transfer" } },
  { phrases: ["my score", "behaviour score", "show my score", "open score", "credit score"], command: { type: "detail", detail: "score" } },
  { phrases: ["open security", "show security", "protection", "security"], command: { type: "detail", detail: "security" } },
  { phrases: ["my profile", "open profile", "my account", "profile"], command: { type: "detail", detail: "profile" } },
  { phrases: ["go back", "close this", "dismiss", "back"], command: { type: "back" } },
  { phrases: ["what is on screen", "what's on screen", "describe screen", "read this screen", "read screen", "read this"], command: { type: "read" } },
  { phrases: ["stop listening", "cancel listening", "stop", "quiet"], command: { type: "stop" } },
  { phrases: ["what can i say", "voice help", "commands", "help"], command: { type: "help" } },
];

/** Substring match against the transcript; longest phrase wins on overlap. */
export function parseCommand(rawTranscript: string): VoiceCommand | null {
  const t = rawTranscript.trim().toLowerCase().replace(/[.,!?]/g, "");
  if (!t) return null;
  let best: { command: VoiceCommand; len: number } | null = null;
  for (const rule of RULES) {
    for (const phrase of rule.phrases) {
      if (t.includes(phrase) && (!best || phrase.length > best.len)) {
        best = { command: rule.command, len: phrase.length };
      }
    }
  }
  return best?.command ?? null;
}

export const VOICE_HELP =
  "You can say: go home, dashboard, chat, transact, services, my score, security, profile, send money, go back, read screen, or stop listening.";

export function isSpeechSynthesisSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

function getSpeechRecognitionCtor(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

export function isSpeechRecognitionSupported(): boolean {
  return getSpeechRecognitionCtor() !== null;
}

export function speak(text: string, opts: { onEnd?: () => void; rate?: number } = {}): void {
  if (!isSpeechSynthesisSupported()) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.rate = opts.rate ?? 1;
  utter.pitch = 1;
  utter.volume = 1;
  if (opts.onEnd) utter.onend = opts.onEnd;
  window.speechSynthesis.speak(utter);
}

export function stopSpeaking(): void {
  if (!isSpeechSynthesisSupported()) return;
  window.speechSynthesis.cancel();
}

/**
 * A voice-command listener that restarts itself after each utterance so it
 * behaves like a "press once, keep listening" mic rather than a one-shot.
 * Stops restarting once `stop()` is called or the mic permission is denied.
 */
export class VoiceCommandListener {
  private recognition: SpeechRecognitionInstance | null = null;
  private wanted = false;

  constructor(
    private onCommand: (command: VoiceCommand | null, transcript: string) => void,
    private onStateChange: (listening: boolean) => void,
    private onError?: (message: string) => void
  ) {}

  start(): void {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      this.onError?.("Voice commands need Chrome or another browser with speech recognition.");
      return;
    }
    this.wanted = true;
    this.launch(Ctor);
  }

  stop(): void {
    this.wanted = false;
    this.recognition?.stop();
  }

  private launch(Ctor: SpeechRecognitionConstructor): void {
    const recognition = new Ctor();
    recognition.lang = "en-NG";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => this.onStateChange(true);
    recognition.onresult = (event) => {
      const transcript = event.results[event.results.length - 1]?.[0]?.transcript ?? "";
      this.onCommand(parseCommand(transcript), transcript);
    };
    recognition.onerror = (event) => {
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        this.wanted = false;
        this.onError?.("Microphone access was denied.");
      }
      // no-speech / aborted / network: swallow it, onend decides whether to restart
    };
    recognition.onend = () => {
      this.onStateChange(false);
      if (this.wanted) this.launch(Ctor);
    };

    this.recognition = recognition;
    recognition.start();
  }
}
