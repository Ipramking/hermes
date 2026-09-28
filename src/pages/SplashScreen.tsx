import { useEffect } from "react";

/**
 * Boot splash. Full-bleed EchoPay red with the wordmark and a soft blush
 * underline, then auto-advances to login.
 */
export function SplashScreen({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t = window.setTimeout(onDone, reduce ? 400 : 1700);
    return () => window.clearTimeout(t);
  }, [onDone]);

  return (
    <div
      className="fixed inset-0 z-[80] flex flex-col items-center justify-center"
      style={{
        background:
          "linear-gradient(160deg, rgb(var(--brand-red-bright)) 0%, rgb(var(--brand-red)) 55%, rgb(var(--brand-red-deep)) 120%)",
      }}
    >
      <div className="animate-pop flex flex-col items-center">
        <span className="font-extrabold tracking-tight text-white" style={{ fontSize: 44 }}>
          EchoPay
        </span>
        <span className="mt-2 h-[4px] w-14 rounded-full bg-brand-blush" />
        <span className="mt-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-white/70">
          Banking, Out Loud
        </span>
      </div>

      {/* loading dots */}
      <div className="absolute bottom-16 flex items-center gap-2">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-2 w-2 rounded-full bg-white/80"
            style={{ animation: `floaty 1s ease-in-out ${i * 0.15}s infinite` }}
          />
        ))}
      </div>
    </div>
  );
}
