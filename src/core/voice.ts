/**
 * Voice layer for Hermes: browser text-to-speech (SpeechSynthesis) and
 * voice-command navigation. Two recognition paths, chosen automatically by
 * useVoice.ts:
 *
 *  - Native (this file's VoiceCommandListener): Chrome/Edge's built-in
 *    SpeechRecognition. Fast, streaming, free - used wherever it exists.
 *  - Universal fallback (core/voiceFallback.ts): an in-browser Whisper model
 *    (via @xenova/transformers, WebAssembly) that only needs a microphone
 *    and no browser-specific API, so it works in Firefox, Safari, and
 *    anywhere else the native API doesn't exist. Loaded on demand.
 *
 * Every browser with a microphone gets a working voice command path either
 * way - isSpeechRecognitionSupported() reflects that union, not just Chrome.
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
  { phrases: ["talk to hermes", "open hermes", "open assistant", "open chat", "assistant", "chat"], command: { type: "nav", tab: "chat" } },
  { phrases: ["open transact", "transactions", "transact"], command: { type: "nav", tab: "transact" } },
  { phrases: ["open services", "show services", "services"], command: { type: "nav", tab: "services" } },
  {
    phrases: [
      "i want to transfer",
      "i want to send",
      "send money",
      "new transfer",
      "start a transfer",
      "make a transfer",
      "transfer money",
      "move money",
      "pay someone",
      "transfer",
    ],
    command: { type: "transfer" },
  },
  {
    phrases: [
      "how much do i have",
      "how much money do i have",
      "what's my balance",
      "whats my balance",
      "my balance",
      "check my balance",
      "my score",
      "behaviour score",
      "show my score",
      "open score",
      "credit score",
      "how is my score",
      "how's my score",
    ],
    command: { type: "detail", detail: "score" },
  },
  {
    phrases: ["am i protected", "is my account safe", "open security", "show security", "protection", "security"],
    command: { type: "detail", detail: "security" },
  },
  { phrases: ["my profile", "open profile", "my account", "profile"], command: { type: "detail", detail: "profile" } },
  { phrases: ["go back", "close this", "dismiss", "back"], command: { type: "back" } },
  { phrases: ["what is on screen", "what's on screen", "describe screen", "read this screen", "read screen", "read this"], command: { type: "read" } },
  { phrases: ["stop listening", "cancel listening", "stop", "quiet"], command: { type: "stop" } },
  {
    phrases: [
      "what do you do",
      "what can you do",
      "what can i say",
      "what can i ask",
      "who are you",
      "what is this",
      "what is hermes",
      "voice help",
      "commands",
      "help",
    ],
    command: { type: "help" },
  },
];

const GREETINGS: { phrases: string[]; reply: string }[] = [
  { phrases: ["thank you", "thanks", "cheers"], reply: "You're welcome!" },
  { phrases: ["good morning", "good afternoon", "good evening"], reply: "Hello! What would you like to do?" },
  { phrases: ["hello", "hi", "hey", "yo"], reply: "Hi! I can check your score, review security, or start a transfer - what do you need?" },
  { phrases: ["how are you", "how're you"], reply: "Running smoothly, thanks for asking. What can I help you with?" },
];

/**
 * Small talk that isn't really a command - greetings, thanks, etc. Checked
 * before parseCommand() so "hi" doesn't get swallowed by some unrelated
 * substring match.
 */
export function matchSmallTalk(rawText: string): string | null {
  const t = rawText.trim().toLowerCase().replace(/[.,!?]/g, "");
  if (!t) return null;
  let best: { reply: string; len: number } | null = null;
  for (const group of GREETINGS) {
    for (const phrase of group.phrases) {
      if (t === phrase || t.startsWith(phrase + " ") || t.endsWith(" " + phrase)) {
        if (!best || phrase.length > best.len) best = { reply: group.reply, len: phrase.length };
      }
    }
  }
  return best?.reply ?? null;
}

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

export const CHAT_HELP =
  "I'm Hermes, your banking assistant. I can check your BehaviourScore, review your security activity, open your dashboard, transact, or services, start a transfer, or tell you what's on screen. Try asking me something like \"I want to transfer money\" or \"how's my score\".";

export function isSpeechSynthesisSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

function getSpeechRecognitionCtor(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

export function isNativeRecognitionSupported(): boolean {
  return getSpeechRecognitionCtor() !== null;
}

export function isMicCaptureSupported(): boolean {
  return typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia;
}

/** True wherever EITHER recognition path can work - native or the Whisper fallback. */
export function isSpeechRecognitionSupported(): boolean {
  return isNativeRecognitionSupported() || isMicCaptureSupported();
}

/** Shape shared by the native listener and the Whisper fallback listener. */
export interface VoiceListener {
  start(): void;
  stop(): void;
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
export class VoiceCommandListener implements VoiceListener {
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
      // useVoice.ts only ever constructs this class when isNativeRecognitionSupported()
      // is true, so this is a defensive fallback, not an expected path.
      this.onError?.("Native voice recognition is unavailable in this browser.");
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
