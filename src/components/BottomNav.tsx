import { Home, Dashboard, Chat, Transact, Services } from "./Icons.js";

/**
 * Hermes-style 5-tab bar: Home, Dashboard, Chat (elevated centre, the Hermes
 * assistant), Transact, Services. Solid brand-red bar, active icon in cream,
 * the centre action raised on a cream disc.
 */
export type TabKey = "home" | "dashboard" | "chat" | "transact" | "services";

const SIDE = [
  { key: "home", label: "Home", Icon: Home },
  { key: "dashboard", label: "Dashboard", Icon: Dashboard },
] as const;

const SIDE2 = [
  { key: "transact", label: "Transact", Icon: Transact },
  { key: "services", label: "Services", Icon: Services },
] as const;

export function BottomNav({
  active,
  onChange,
}: {
  active: TabKey;
  onChange: (k: TabKey) => void;
}) {
  const item = (key: TabKey, label: string, Icon: typeof Home) => {
    const is = active === key;
    return (
      <button
        key={key}
        onClick={() => onChange(key)}
        aria-current={is ? "page" : undefined}
        className="relative flex min-h-[52px] flex-1 flex-col items-center justify-center gap-1"
      >
        {is && <span className="absolute top-0 h-[3px] w-7 rounded-full bg-brand-blush" />}
        <Icon size={22} weight={is ? "fill" : "regular"} className={is ? "text-white" : "text-white/60"} />
        <span className={`text-[10px] font-bold ${is ? "text-white" : "text-white/60"}`}>
          {label}
        </span>
      </button>
    );
  };

  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40">
      <div className="mx-auto max-w-[430px]">
        <div className="relative flex items-end justify-around rounded-t-[22px] bg-brand-red px-2 pb-1.5 pt-2 shadow-[0_-8px_24px_-16px_rgb(0_0_0/0.6)]">
          {SIDE.map((t) => item(t.key, t.label, t.Icon))}

          {/* elevated centre: the Hermes assistant */}
          <div className="flex min-w-[64px] flex-col items-center">
            <button
              onClick={() => onChange("chat")}
              aria-label="Chat with Hermes"
              className="-mt-7 grid h-14 w-14 place-items-center rounded-full border-4 border-bg text-brand-red-deep transition-transform active:scale-95"
              style={{
                background: "linear-gradient(135deg, rgb(var(--brand-cream-hi)), rgb(var(--brand-cream)))",
                boxShadow: "0 10px 22px -10px rgb(var(--brand-cream) / 0.9)",
              }}
            >
              <Chat size={26} weight="fill" />
            </button>
            <span className={`-mt-0.5 text-[10px] font-bold ${active === "chat" ? "text-white" : "text-white/60"}`}>
              Chat
            </span>
          </div>

          {SIDE2.map((t) => item(t.key, t.label, t.Icon))}
        </div>
      </div>
    </nav>
  );
}
