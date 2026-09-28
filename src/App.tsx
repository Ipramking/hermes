import { useEffect, useMemo, useState } from "react";
import type { Icon } from "@phosphor-icons/react";
import {
  amara,
  fraudTxn,
  AS_OF,
  buildFingerprint,
  computeBehaviourScore,
  evaluate,
  naira,
  VOICE_HELP,
  type Transaction,
  type DeviationResult,
  type VoiceCommand,
} from "./core/index.js";
import { useVoice } from "./hooks/useVoice.js";
import { BottomNav, type TabKey } from "./components/BottomNav.js";
import { TabScaffold } from "./components/TabScaffold.js";
import { ComingSoon } from "./components/ComingSoon.js";
import { SentryInterrupt } from "./components/SentryInterrupt.js";
import { FaceScan } from "./components/FaceScan.js";
import { SentryResult, type ResultKind } from "./components/SentryResult.js";
import { TransactionReceipt } from "./components/TransactionReceipt.js";
import { TransferFlow } from "./components/TransferFlow.js";
import { HomeSkeleton } from "./components/Skeleton.js";
import { HomeTab } from "./pages/HomeTab.js";
import { DashboardTab } from "./pages/DashboardTab.js";
import { TransactTab } from "./pages/TransactTab.js";
import { ServicesTab } from "./pages/ServicesTab.js";
import { ChatTab } from "./pages/ChatTab.js";
import { ScoreTab } from "./pages/ScoreTab.js";
import { SecurityTab, type SecurityEvent } from "./pages/SecurityTab.js";
import { ProfileTab } from "./pages/ProfileTab.js";
import { SplashScreen } from "./pages/SplashScreen.js";
import { LoginScreen } from "./pages/LoginScreen.js";
import { Notif as BottomNavBell } from "./components/Icons.js";

type Detail = null | "score" | "security" | "profile";

const TAB_LABEL: Record<TabKey, string> = {
  home: "Home",
  dashboard: "Dashboard",
  chat: "Chat",
  transact: "Transact",
  services: "Services",
};
const DETAIL_LABEL: Record<NonNullable<Detail>, string> = {
  score: "your BehaviourScore",
  security: "Security",
  profile: "your Profile",
};

const SEED_LOG: SecurityEvent[] = [
  {
    id: "seed-1",
    ts: "2026-08-30T14:20:00.000Z",
    title: "Sent ₦3,000",
    detail: "To MTN Airtime. Matched your usual pattern.",
    status: "allowed",
  },
  {
    id: "seed-2",
    ts: "2026-08-22T21:05:00.000Z",
    title: "Held ₦52,000",
    detail: "New recipient at an unusual time. You confirmed by SMS.",
    status: "held",
  },
];

export default function App() {
  const fingerprint = useMemo(() => buildFingerprint(amara), []);
  const score = useMemo(() => computeBehaviourScore(amara, AS_OF), []);

  const [tab, setTab] = useState<TabKey>(() => {
    const t = new URLSearchParams(window.location.search).get("tab");
    return (["home", "dashboard", "chat", "transact", "services"] as TabKey[]).includes(t as TabKey)
      ? (t as TabKey)
      : "home";
  });
  const [detail, setDetail] = useState<Detail>(null);
  const [transferOpen, setTransferOpen] = useState(false);
  const [soon, setSoon] = useState<{ title: string; Icon: Icon } | null>(null);
  const [pending, setPending] = useState<{ txn: Transaction; result: DeviationResult } | null>(() => {
    const p = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
    if (p?.has("sentry") || p?.has("facescan")) {
      return { txn: fraudTxn, result: evaluate(fraudTxn, buildFingerprint(amara)) };
    }
    return null;
  });
  const [scanning, setScanning] = useState(
    () => typeof window !== "undefined" && new URLSearchParams(window.location.search).has("facescan")
  );
  const [toast, setToast] = useState<{ title: string; body?: string } | null>(null);
  const [log, setLog] = useState<SecurityEvent[]>(SEED_LOG);
  const [receipt, setReceipt] = useState<{ txn: Transaction; verifiedBy: "PIN" | "Face scan" } | null>(null);
  const [outcome, setOutcome] = useState<{ kind: ResultKind; txn: Transaction; result: DeviationResult } | null>(() => {
    const r = new URLSearchParams(window.location.search).get("result");
    if (r === "proceed" || r === "unsure" || r === "cancel") {
      return { kind: r, txn: fraudTxn, result: evaluate(fraudTxn, buildFingerprint(amara)) };
    }
    return null;
  });
  const [loaded, setLoaded] = useState(false);
  const [phase, setPhase] = useState<"splash" | "login" | "app">(() => {
    const s = new URLSearchParams(window.location.search).get("screen");
    return s === "login" || s === "app" || s === "splash" ? s : "splash";
  });

  useEffect(() => {
    const t = window.setTimeout(() => setLoaded(true), 750);
    return () => window.clearTimeout(t);
  }, []);

  const isAuthed = () => localStorage.getItem("echopay_authed") === "true";

  function flash(title: string, body?: string) {
    setToast({ title, body });
    window.setTimeout(() => setToast(null), 2600);
  }
  function logEvent(e: Omit<SecurityEvent, "id" | "ts">) {
    setLog((prev) => [{ ...e, id: `evt-${Date.now()}`, ts: new Date().toISOString() }, ...prev]);
  }
  function attempt(txn: Transaction) {
    const result = evaluate(txn, fingerprint);
    if (result.flagged) setPending({ txn, result });
    else {
      flash("Money sent successfully", `${naira(txn.amountKobo)} sent to ${txn.counterpartyName}.`);
      logEvent({ title: `Sent ${naira(txn.amountKobo)}`, detail: `To ${txn.counterpartyName}. Matched your usual pattern.`, status: "allowed" });
      setReceipt({ txn, verifiedBy: "PIN" });
    }
  }
  function resolve(kind: ResultKind) {
    if (!pending) return;
    const { txn, result } = pending;
    const amount = naira(txn.amountKobo);
    if (kind === "proceed") {
      logEvent({ title: `Confirmed ${amount}`, detail: `To ${txn.counterpartyName}. Verified with a face scan.`, status: "allowed" });
    } else if (kind === "cancel") {
      logEvent({ title: `Blocked ${amount}`, detail: result.reasons[0]?.detail ?? "Unusual transfer stopped.", status: "blocked" });
    } else {
      logEvent({ title: `Held ${amount}`, detail: "Waiting for your confirmation by SMS.", status: "held" });
    }
    setOutcome({ kind, txn, result });
    setPending(null);
  }

  function closeOutcome(msg?: string) {
    setOutcome(null);
    setTab("home");
    if (msg) flash(msg);
  }

  const openTransfer = () => setTransferOpen(true);
  const comingSoon = (title: string, Icon: Icon) => setSoon({ title, Icon });

  function describeScreen(): string {
    if (detail === "score") return `Your BehaviourScore is ${score.score}, rated ${score.band}. ${score.headline}`;
    if (detail === "security") return "This is your security and protection activity. It lists transfers that were allowed, held, or blocked.";
    if (detail === "profile") return `This is your profile. Pulse member since ${new Date(amara.openedAt).getFullYear()}.`;
    const first = amara.ownerName.split(" ")[0];
    switch (tab) {
      case "home":
        return `Hi ${first}. Your available balance is ${naira(amara.balanceKobo)}. Your BehaviourScore is ${score.score}, rated ${score.band}.`;
      case "dashboard":
        return "This is your spending dashboard.";
      case "transact":
        return "This is Transact. You can transfer money, pay bills, or buy airtime and data from here.";
      case "services":
        return "This is Services, with your security, credit, and EchoPay service options.";
      case "chat":
        return "This is your chat with Echo, your EchoPay assistant.";
      default:
        return "You're in EchoPay.";
    }
  }

  function handleVoiceCommand(cmd: VoiceCommand | null, transcript: string) {
    if (!cmd) {
      voice.speak("Sorry, I didn't catch that. Say help to hear what you can say.");
      flash(`Heard: "${transcript}"`);
      return;
    }
    switch (cmd.type) {
      case "nav":
        setDetail(null);
        setTab(cmd.tab);
        voice.speak(`Opening ${TAB_LABEL[cmd.tab]}`);
        break;
      case "detail":
        setDetail(cmd.detail);
        voice.speak(`Opening ${DETAIL_LABEL[cmd.detail]}`);
        break;
      case "transfer":
        openTransfer();
        voice.speak("Starting a transfer.");
        break;
      case "back":
        if (detail) {
          setDetail(null);
          voice.speak("Going back.");
        } else if (transferOpen) {
          setTransferOpen(false);
          voice.speak("Closed.");
        } else {
          voice.speak("There's nothing to go back from.");
        }
        break;
      case "read":
        voice.speak(describeScreen());
        break;
      case "stop":
        voice.toggle();
        voice.speak("Voice commands off.");
        break;
      case "help":
        voice.speak(VOICE_HELP);
        break;
    }
  }

  const voice = useVoice(handleVoiceCommand);

  useEffect(() => {
    if (voice.error) flash(voice.error);
  }, [voice.error]);

  function toggleVoice() {
    const wasListening = voice.listening;
    voice.toggle();
    if (!wasListening) voice.speak("Listening. Say help to hear what you can say.");
    else voice.stopSpeaking();
  }

  if (phase === "splash") {
    return (
      <div className="mx-auto min-h-full w-full max-w-[430px]">
        <SplashScreen onDone={() => setPhase(isAuthed() ? "app" : "login")} />
      </div>
    );
  }
  if (phase === "login") {
    return (
      <div className="ambient mx-auto min-h-full w-full max-w-[430px]">
        <LoginScreen
          onLogin={() => {
            localStorage.setItem("echopay_authed", "true");
            setPhase("app");
          }}
        />
      </div>
    );
  }

  const micProps = { micListening: voice.listening, micSupported: voice.commandsSupported, onMicToggle: toggleVoice };

  return (
    <div className="ambient relative mx-auto min-h-full w-full max-w-[430px]">
      {detail === "score" && <ScoreTab score={score} onBack={() => setDetail(null)} {...micProps} />}
      {detail === "security" && (
        <SecurityTab
          fingerprint={fingerprint}
          log={log}
          onTest={() => attempt(fraudTxn)}
          onBack={() => setDetail(null)}
          {...micProps}
        />
      )}
      {detail === "profile" && <ProfileTab score={score} onBack={() => setDetail(null)} {...micProps} />}

      {!detail && (
        <>
          <div key={tab} className="pb-28">
            {tab === "home" &&
              (loaded ? (
                <TabScaffold
                  onProfile={() => setDetail("profile")}
                  onNotifications={() => comingSoon("Notifications", BottomNavBell)}
                  {...micProps}
                >
                  <HomeTab
                    score={score}
                    onTransfer={openTransfer}
                    onGoScore={() => setDetail("score")}
                    onComingSoon={comingSoon}
                  />
                </TabScaffold>
              ) : (
                <HomeSkeleton />
              ))}

            {tab === "dashboard" && (
              <TabScaffold
                onProfile={() => setDetail("profile")}
                onNotifications={() => comingSoon("Notifications", BottomNavBell)}
                {...micProps}
              >
                <DashboardTab score={score} onGoScore={() => setDetail("score")} onComingSoon={comingSoon} />
              </TabScaffold>
            )}

            {tab === "transact" && (
              <TabScaffold
                onProfile={() => setDetail("profile")}
                onNotifications={() => comingSoon("Notifications", BottomNavBell)}
                {...micProps}
              >
                <TransactTab onTransfer={openTransfer} onComingSoon={comingSoon} />
              </TabScaffold>
            )}

            {tab === "services" && (
              <TabScaffold
                onProfile={() => setDetail("profile")}
                onNotifications={() => comingSoon("Notifications", BottomNavBell)}
                {...micProps}
              >
                <ServicesTab
                  onGoScore={() => setDetail("score")}
                  onGoSecurity={() => setDetail("security")}
                  onComingSoon={comingSoon}
                />
              </TabScaffold>
            )}

            {tab === "chat" && (
              <ChatTab
                onGoScore={() => setDetail("score")}
                onGoSecurity={() => setDetail("security")}
                onTransfer={openTransfer}
                {...micProps}
              />
            )}
          </div>

          <BottomNav active={tab} onChange={setTab} />
        </>
      )}

      {transferOpen && (
        <TransferFlow
          onClose={() => setTransferOpen(false)}
          onSubmit={(t) => {
            setTransferOpen(false);
            attempt(t);
          }}
        />
      )}

      {pending && (
        <SentryInterrupt
          txn={pending.txn}
          result={pending.result}
          onVerify={() => setScanning(true)}
          onCancel={() => resolve("cancel")}
          onUnsure={() => resolve("unsure")}
        />
      )}

      {pending && scanning && (
        <FaceScan
          txn={pending.txn}
          onVerified={() => {
            setScanning(false);
            resolve("proceed");
          }}
          onCancel={() => setScanning(false)}
        />
      )}

      {outcome && (
        <SentryResult
          kind={outcome.kind}
          txn={outcome.txn}
          result={outcome.result}
          onPrimary={() => {
            if (outcome.kind === "cancel") {
              setOutcome(null);
              setDetail("security");
            } else if (outcome.kind === "unsure") {
              closeOutcome("Confirmation code sent to ****4097.");
            } else {
              closeOutcome();
            }
          }}
          onSecondary={() => {
            if (outcome.kind === "proceed") {
              setOutcome(null);
              setDetail("security");
            } else if (outcome.kind === "unsure") {
              closeOutcome("Transfer cancelled. Your money stays put.");
            } else {
              closeOutcome();
            }
          }}
          onViewReceipt={() => setReceipt({ txn: outcome.txn, verifiedBy: "Face scan" })}
        />
      )}

      {receipt && (
        <TransactionReceipt
          txn={receipt.txn}
          verifiedBy={receipt.verifiedBy}
          onDone={() => {
            setReceipt(null);
            closeOutcome();
          }}
          onViewHistory={() => {
            setReceipt(null);
            setOutcome(null);
            setDetail("security");
          }}
        />
      )}

      {soon && <ComingSoon title={soon.title} Icon={soon.Icon} onClose={() => setSoon(null)} />}

      {toast && (
        <div className="fixed inset-x-0 bottom-24 z-[55] mx-auto w-[92%] max-w-[400px] animate-pop rounded-ctrl bg-brand-red px-4 py-3 text-center shadow-card">
          <p className="text-sm font-bold text-white">{toast.title}</p>
          {toast.body && <p className="mt-0.5 text-xs text-white/85">{toast.body}</p>}
        </div>
      )}
    </div>
  );
}
