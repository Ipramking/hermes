import { useEffect, useRef, useState } from "react";
import {
  VoiceCommandListener,
  speak as speakOut,
  stopSpeaking,
  isSpeechRecognitionSupported,
  isSpeechSynthesisSupported,
  type VoiceCommand,
} from "../core/index.js";

/**
 * Wires the core VoiceCommandListener into React state and cleans it up on
 * unmount. `onCommand` fires for every recognized utterance, even ones that
 * didn't match a known phrase (command is null then), so the caller can
 * speak a "didn't catch that" fallback.
 */
export function useVoice(onCommand: (command: VoiceCommand | null, transcript: string) => void) {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const listenerRef = useRef<VoiceCommandListener | null>(null);
  const onCommandRef = useRef(onCommand);
  onCommandRef.current = onCommand;

  useEffect(() => {
    const listener = new VoiceCommandListener(
      (command, text) => {
        setTranscript(text);
        onCommandRef.current(command, text);
      },
      setListening,
      setError
    );
    listenerRef.current = listener;
    return () => listener.stop();
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
