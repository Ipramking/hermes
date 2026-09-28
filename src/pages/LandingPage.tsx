import { useEffect, useState } from "react";
import { toDataURL } from "qrcode";
import {
  ShieldCheck,
  Gauge,
  MicOn,
  MonitorIcon,
  AndroidIcon,
  DownloadIcon,
  QrCodeIcon,
  CheckOk,
} from "../components/Icons.js";

const APK_PATH = "/echopay.apk";

const FEATURES = [
  {
    Icon: Gauge,
    title: "BehaviourScore",
    body: "A credit identity built from how you actually bank, not from loans you've never had.",
  },
  {
    Icon: ShieldCheck,
    title: "SentryAI protection",
    body: "Unusual transfers are held and can only be released with a face scan - never a tap alone.",
  },
  {
    Icon: MicOn,
    title: "Voice-first",
    body: "Navigate the whole app, check your balance, or start a transfer, all by talking to Echo.",
  },
];

const STEPS = [
  "Tap Download APK, or scan the QR code with your phone's camera.",
  "Open the downloaded file. Android may ask you to allow installs from this source - allow it once.",
  "Open EchoPay and log in to start.",
];

/**
 * The product's front door: pick the web app or the Android app. Unlike the
 * rest of the product (a fixed 430px phone frame), this page is a real
 * responsive marketing page since it's meant to be seen on any device,
 * laptops included - that's the whole point of the QR code.
 */
export function LandingPage({ onUseWebApp }: { onUseWebApp: () => void }) {
  const [qr, setQr] = useState<string | null>(null);

  useEffect(() => {
    const url = `${window.location.origin}${APK_PATH}`;
    toDataURL(url, { margin: 1, width: 240, color: { dark: "#221818", light: "#FAF8F8" } })
      .then(setQr)
      .catch(() => setQr(null));
  }, []);

  return (
    <div className="min-h-full bg-bg">
      {/* top bar */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <span className="text-xl font-extrabold tracking-tight text-ink">
          Echo<span className="text-brand-red">Pay</span>
        </span>
        <button onClick={onUseWebApp} className="btn-ghost px-4 py-2 text-sm">
          Use Web App
        </button>
      </header>

      {/* hero */}
      <section className="ambient mx-auto max-w-6xl px-6 pb-16 pt-10 text-center sm:pt-16">
        <h1 className="mx-auto max-w-3xl text-4xl font-extrabold leading-tight tracking-tight text-ink sm:text-5xl">
          Your Smarter Financial Experience
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-ink-soft sm:text-lg">
          EchoPay pairs a real-time fraud interrupt and a behaviour-based credit score with
          voice-first navigation - bank the way that makes sense for you, on the web or on your phone.
        </p>
        <div className="mx-auto mt-8 flex max-w-md flex-col gap-3 sm:flex-row sm:justify-center">
          <button onClick={onUseWebApp} className="btn-primary flex-1 gap-2 py-4 text-base">
            <MonitorIcon size={18} weight="bold" /> Use Web App
          </button>
          <a href="#android" className="btn-ghost flex-1 gap-2 py-4 text-base">
            <AndroidIcon size={18} weight="bold" /> Get Android App
          </a>
        </div>
      </section>

      {/* android download */}
      <section id="android" className="border-y border-hairline bg-surface2/60">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 py-14 sm:grid-cols-2 sm:items-center">
          <div>
            <span className="label-micro flex items-center gap-1.5 text-brand-red">
              <AndroidIcon size={14} weight="bold" /> Android app
            </span>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-ink">Take it with you.</h2>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-ink-soft">
              Download the Android app for a faster, mobile-first experience - the same EchoPay,
              installed on your phone.
            </p>

            <a
              href={APK_PATH}
              download
              className="btn-primary mt-6 inline-flex w-full gap-2 py-4 text-base sm:w-auto sm:px-8"
            >
              <DownloadIcon size={18} weight="bold" /> Download APK
            </a>

            <ol className="mt-8 space-y-3">
              {STEPS.map((s, i) => (
                <li key={s} className="flex items-start gap-3 text-sm text-ink-soft">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-red/10 text-xs font-bold text-brand-red">
                    {i + 1}
                  </span>
                  {s}
                </li>
              ))}
            </ol>
            <p className="mt-6 text-xs text-ink-faint">
              Requires Android 7.0 or later. Installing from outside the Play Store needs one-time
              permission from Android - this is normal for apps distributed directly by their maker.
            </p>
          </div>

          <div className="flex flex-col items-center justify-self-center rounded-card border border-hairline bg-surface p-8 shadow-card">
            <span className="label-micro flex items-center gap-1.5">
              <QrCodeIcon size={14} /> Scan to download
            </span>
            <div className="mt-4 grid h-[240px] w-[240px] place-items-center rounded-ctrl bg-overlay-bg/5">
              {qr ? (
                <img src={qr} alt="QR code to download the EchoPay Android app" width={240} height={240} />
              ) : (
                <div className="skeleton h-[240px] w-[240px] rounded-ctrl" />
              )}
            </div>
            <p className="mt-4 text-center text-xs text-ink-faint">
              Point your phone's camera at the code
            </p>
          </div>
        </div>
      </section>

      {/* feature highlights */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="text-center text-2xl font-extrabold tracking-tight text-ink">
          One data layer. Three ways it protects you.
        </h2>
        <div className="mt-10 grid gap-5 sm:grid-cols-3">
          {FEATURES.map(({ Icon, title, body }) => (
            <div key={title} className="card p-6">
              <span className="grid h-11 w-11 place-items-center rounded-full bg-brand-red/10 text-brand-red">
                <Icon size={20} weight="bold" />
              </span>
              <h3 className="mt-4 text-base font-extrabold text-ink">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* footer CTA */}
      <section className="border-t border-hairline">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-6 py-12 text-center">
          <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-positive">
            <CheckOk size={14} weight="fill" /> No account needed to preview
          </span>
          <button onClick={onUseWebApp} className="btn-primary gap-2 px-8 py-4 text-base">
            <MonitorIcon size={18} weight="bold" /> Try EchoPay in your browser
          </button>
          <p className="mt-2 text-xs text-ink-faint">EchoPay &middot; a demo banking experience</p>
        </div>
      </section>
    </div>
  );
}
