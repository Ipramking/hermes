import { useState } from "react";
import { naira, transactionReference, type Transaction } from "../core/index.js";
import { CheckOk, Home, ClockIcon, ShareIcon, DownloadIcon, ReceiptIcon } from "./Icons.js";

const PAYMENT_METHOD = "Pulse account · •••• 4097";
const FEE_KOBO = 0; // Hermes-to-Hermes transfers are fee-free

const stamp = (iso: string) =>
  new Date(iso).toLocaleString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

/**
 * The real transaction receipt - shown after any successful send (normal PIN
 * path or flagged-then-face-scan-verified path), replacing a bare "Money
 * sent" toast with something that reads like an actual banking receipt.
 */
export function TransactionReceipt({
  txn,
  verifiedBy = "PIN",
  onDone,
  onViewHistory,
}: {
  txn: Transaction;
  verifiedBy?: "PIN" | "Face scan";
  onDone: () => void;
  onViewHistory?: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const ref = transactionReference(txn.id);
  const totalKobo = txn.amountKobo + FEE_KOBO;

  const summaryText = [
    "Hermes transaction receipt",
    "Status: Successful",
    `Recipient: ${txn.counterpartyName}`,
    `Account/Phone: ${txn.counterpartyId.replace(/^new_/, "")}`,
    `Amount: ${naira(txn.amountKobo)}`,
    `Fee: ${naira(FEE_KOBO)}`,
    `Total debited: ${naira(totalKobo)}`,
    `Date: ${stamp(txn.ts)}`,
    `Reference: ${ref}`,
    `Payment method: ${PAYMENT_METHOD}`,
  ].join("\n");

  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ title: "Hermes receipt", text: summaryText });
        return;
      } catch {
        /* user cancelled the share sheet - fall through to clipboard */
      }
    }
    await navigator.clipboard?.writeText(summaryText);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  function download() {
    const blob = new Blob([summaryText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Hermes-Receipt-${ref}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const facts: { k: string; v: string }[] = [
    { k: "Recipient", v: txn.counterpartyName },
    { k: "Account / Phone", v: txn.counterpartyId.replace(/^new_/, "") },
    { k: "Amount", v: naira(txn.amountKobo) },
    { k: "Fee", v: naira(FEE_KOBO) },
    { k: "Total debited", v: naira(totalKobo) },
    { k: "Payment method", v: PAYMENT_METHOD },
    { k: "Verified by", v: verifiedBy },
    { k: "Date & time", v: stamp(txn.ts) },
    { k: "Reference ID", v: ref },
  ];

  return (
    <div className="fixed inset-0 z-[72] overflow-y-auto bg-bg">
      <div className="mx-auto flex min-h-full w-full max-w-[430px] flex-col px-5 pb-8 pt-safe">
        {/* concise confirmation */}
        <div className="animate-pop flex flex-col items-center pt-6 text-center">
          <span className="grid h-16 w-16 place-items-center rounded-full bg-positive/15">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-positive text-white">
              <CheckOk size={26} weight="fill" />
            </span>
          </span>
          <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.16em] text-positive">Transaction successful</p>
          <h1 className="mt-2 text-2xl font-extrabold leading-tight text-ink">{naira(txn.amountKobo)}</h1>
          <p className="mt-1 text-sm text-ink-soft">sent to {txn.counterpartyName}</p>
        </div>

        {/* the receipt itself */}
        <div className="animate-rise mt-6 card overflow-hidden">
          <div className="flex items-center justify-between border-b border-hairline px-4 py-3">
            <span className="label-micro flex items-center gap-1.5">
              <ReceiptIcon size={14} /> Receipt
            </span>
            <span className="rounded-full bg-positive px-2.5 py-1 text-[11px] font-bold text-white">Successful</span>
          </div>
          <dl className="divide-y divide-hairline/70">
            {facts.map((f) => (
              <div key={f.k} className="flex items-center justify-between gap-3 px-4 py-3">
                <dt className="text-xs text-ink-faint">{f.k}</dt>
                <dd className="tabular max-w-[62%] truncate text-right text-sm font-semibold text-ink">{f.v}</dd>
              </div>
            ))}
          </dl>
        </div>

        <p className="mt-3 px-1 text-center text-[11px] leading-relaxed text-ink-faint">
          Keep this reference for your records. Hermes never asks for your PIN or password outside the app.
        </p>

        {/* receipt actions */}
        <div className="animate-rise mt-5 grid grid-cols-2 gap-2.5">
          <button onClick={download} className="btn-ghost gap-2 py-3 text-sm">
            <DownloadIcon size={16} weight="bold" /> Save
          </button>
          <button onClick={share} className="btn-ghost gap-2 py-3 text-sm">
            <ShareIcon size={16} weight="bold" /> {copied ? "Copied" : "Share"}
          </button>
        </div>

        {/* primary actions */}
        <div className="mt-6 space-y-2.5">
          <button onClick={onDone} className="btn-primary w-full gap-2 py-3.5 text-sm">
            <Home size={16} weight="fill" /> Back to dashboard
          </button>
          {onViewHistory && (
            <button onClick={onViewHistory} className="btn-ghost w-full gap-2 py-3.5 text-sm">
              <ClockIcon size={16} /> View in transaction history
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
