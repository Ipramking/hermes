import { MicOn, MicOff } from "./Icons.js";

/**
 * Voice control, but as a real header element rather than a floating orphan
 * button - it sits in the same icon row as the bell/profile/back controls on
 * every screen, so it reads as part of the app instead of bolted on top of
 * it. `tone` matches it to a red header (dark) or a white content area
 * (light) without changing behaviour.
 */
export function HeaderMicButton({
  listening,
  supported,
  onToggle,
  tone = "light",
}: {
  listening: boolean;
  supported: boolean;
  onToggle: () => void;
  tone?: "light" | "dark";
}) {
  const dark = tone === "dark";
  return (
    <button
      onClick={onToggle}
      aria-label={listening ? "Stop voice commands" : supported ? "Start voice commands" : "Voice commands unavailable in this browser"}
      aria-pressed={listening}
      className={`relative grid h-9 w-9 shrink-0 place-items-center rounded-full transition active:scale-95 ${
        listening
          ? "bg-brand-red text-white"
          : dark
            ? "bg-white/12 text-white"
            : "border border-hairline bg-surface text-brand-red"
      }`}
    >
      {listening && (
        <span className="absolute inset-0 animate-ping rounded-full" style={{ background: "rgb(var(--brand-red) / 0.45)" }} />
      )}
      {supported ? (
        <MicOn size={16} weight={listening ? "fill" : "bold"} className="relative" />
      ) : (
        <MicOff size={16} weight="bold" className={`relative ${dark ? "text-white/40" : "text-ink-faint"}`} />
      )}
    </button>
  );
}
