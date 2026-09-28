import { MicOn, MicOff } from "./Icons.js";

/**
 * Floating mic. White-on-red when listening (with a pulsing ring), red-on-
 * white when idle, greyed out with a slash if the browser has no speech
 * recognition. Positioned above whatever bottom chrome is currently showing.
 */
export function VoiceControl({
  listening,
  supported,
  onToggle,
  bottomOffset = 96,
}: {
  listening: boolean;
  supported: boolean;
  onToggle: () => void;
  bottomOffset?: number;
}) {
  return (
    <button
      onClick={onToggle}
      aria-label={listening ? "Stop voice commands" : supported ? "Start voice commands" : "Voice commands unavailable in this browser"}
      aria-pressed={listening}
      className="fixed right-4 z-50 grid h-14 w-14 place-items-center rounded-full shadow-card transition-transform active:scale-95"
      style={{
        bottom: bottomOffset,
        background: listening ? "rgb(var(--brand-red))" : "rgb(var(--surface))",
        border: listening ? "none" : "1px solid rgb(var(--hairline))",
      }}
    >
      {listening && (
        <span
          className="absolute inset-0 animate-ping rounded-full"
          style={{ background: "rgb(var(--brand-red) / 0.4)" }}
        />
      )}
      {supported ? (
        <MicOn
          size={22}
          weight={listening ? "fill" : "bold"}
          className={`relative ${listening ? "text-white" : "text-brand-red"}`}
        />
      ) : (
        <MicOff size={22} weight="bold" className="relative text-ink-faint" />
      )}
    </button>
  );
}
