import { useEffect, useRef, useState } from "react";
import {
  VoiceCommandListener,
  speak as speakOut,
  stopSpeaking,
  isNativeRecognitionSupported,
  isSpeechRecognitionSupported,
  isSpeechSynthesisSupported,
  type VoiceCommand,
  type VoiceListener,
} from "../core/index.js";

/**
 * Wires a core voice listener into React state and cleans it up on unmount.
 * `onCommand` fires for every recognized utterance, even ones that didn't
 * match a known phrase (command is null then), so the caller can speak a
 * "didn't catch that" fallback.
 *
 * Which listener gets built is decided once, here: Chrome/Edge get the fast
 * native SpeechRecognition path immediately; everywhere else lazily imports
 * the Whisper-in-a-worker fallback (voiceFallback.ts) so browsers that DO
 * have native support never pay for that module or its model download.
 */
export function useVoice(onCommand: (command: VoiceCommand | null, transcript: string) => void) {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const listenerRef = useRef<VoiceListener | null>(null);
  const onCommandRef = useRef(onCommand);
  onCommandRef.current = onCommand;

  useEffect(() => {
    let cancelled = false;
    const handleCommand = (command: VoiceCommand | null, text: string) => {
      setTranscript(text);
      onCommandRef.current(command, text);
    };

    if (isNativeRecognitionSupported()) {
      listenerRef.current = new VoiceCommandListener(handleCommand, setListening, setError);
    } else {
      import("../core/voiceFallback.js").then(({ WhisperVoiceListener }) => {
        if (!cancelled) listenerRef.current = new WhisperVoiceListener(handleCommand, setListening, setError);
      });
    }

    return () => {
      cancelled = true;
      listenerRef.current?.stop();
    };
  }, []);

  function toggle() {
    setError(null);
    if (listening) listenerRef.current?.stop();
    else listenerRef.current?.start();
  }

  return {
    listening,
    transcript,
    error,
    toggle,
    speak: speakOut,
    stopSpeaking,
    commandsSupported: isSpeechRecognitionSupported(),
    speechSupported: isSpeechSynthesisSupported(),
  };
}
