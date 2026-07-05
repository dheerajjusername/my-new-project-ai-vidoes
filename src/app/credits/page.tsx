"use client";

import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { redirectIfLoggedOut } from "@/components/auth-nav";
import { CREDIT_PACKS, rupees } from "@/lib/credit-packs";

const COSTS = [
  { action: "Create a character (5 reference images)", credits: 25 },
  { action: "Generate a shot list / plan", credits: 3 },
  { action: "Generate one video shot / clip", credits: 25 },
  { action: "Generate one still image", credits: 8 },
  { action: "Generate a voiceover", credits: 3 },
  { action: "Stitch the final video", credits: 0 },
];

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    Razorpay?: any;
  }
}

function loadRazorpay(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export default function CreditsPage() {
  const [credits, setCredits] = useState<number | null>(null);
  const [email, setEmail] = useState<string>("");
  const [buying, setBuying] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function refresh() {
    fetch("/api/auth/me")
      .then((r) => {
        if (redirectIfLoggedOut(r)) return null;
        return r.json();
      })
      .then((d) => {
        if (!d) return;
        setCredits(d.user?.credits ?? 0);
        setEmail(d.user?.email ?? "");
      })
      .catch(() => {});
  }

  useEffect(() => {
    refresh();
  }, []);

  async function buy(packId: string) {
    setBuying(packId);
    setError(null);
    setMsg(null);
    try {
      const res = await fetch("/api/credits/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not start payment");
        return;
      }
      const ok = await loadRazorpay();
      if (!ok) {
        setError("Could not load the payment window. Check your connection.");
        return;
      }
      const rzp = new window.Razorpay({
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        name: "Ad Champ",
        description: `${data.credits} credits · ${data.label}`,
        order_id: data.orderId,
        prefill: { email },
        theme: { color: "#7c3aed" },
        handler: async (resp: any) => {
          const vr = await fetch("/api/credits/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(resp),
          });
          const vd = await vr.json();
          if (!vr.ok) {
            setError(vd.error ?? "Payment verification failed");
          } else {
            setMsg(`Payment successful — ${vd.added ?? data.credits} credits added!`);
            setCredits(vd.credits ?? null);
          }
        },
        modal: { ondismiss: () => setBuying(null) },
      });
      rzp.on("payment.failed", () => setError("Payment failed. Please try again."));
      rzp.open();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setBuying(null);
    }
  }

  return (
    <div className="flex-1 text-neutral-100">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Buy <span className="gradient-text">credits</span>
        </h1>
        <p className="mt-2 text-neutral-400">
          Credits are spent whenever you generate images, video or voice. Pay
          securely with UPI, card or netbanking.
        </p>

        {/* Balance */}
        <div className="glass mt-8 rounded-2xl p-8 text-center">
          <p className="text-sm text-neutral-400">Your balance</p>
          <p className="mt-2 text-5xl font-semibold">
            {credits ?? "…"}
            <span className="ml-2 text-lg font-normal text-neutral-400">credits</span>
          </p>
        </div>

        {msg && (
          <p className="mt-6 rounded-lg bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
            {msg}
          </p>
        )}
        {error && (
          <p className="mt-6 rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </p>
        )}

        {/* Packs */}
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {CREDIT_PACKS.map((p) => (
            <div
              key={p.id}
              className={
                "glass relative flex flex-col rounded-2xl p-6 " +
                (p.badge ? "border-violet-400/40" : "")
              }
            >
              {p.badge && (
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-violet-500 to-blue-500 px-3 py-0.5 text-[10px] font-semibold text-white">
                  {p.badge}
                </span>
              )}
              <h3 className="font-medium text-white">{p.label}</h3>
              <p className="mt-2 text-3xl font-semibold">
                {p.credits}
                <span className="ml-1 text-sm font-normal text-neutral-400">credits</span>
              </p>
              <p className="mt-1 text-sm text-neutral-400">{rupees(p.amountPaise)}</p>
              <button
                onClick={() => buy(p.id)}
                disabled={buying !== null}
                className="btn-primary mt-5 w-full py-2.5 text-sm"
              >
                {buying === p.id ? "Opening…" : `Buy ${rupees(p.amountPaise)}`}
              </button>
            </div>
          ))}
        </div>

        {/* Cost table */}
        <div className="glass mt-10 overflow-hidden rounded-2xl">
          <div className="border-b border-white/10 px-6 py-4">
            <h2 className="font-medium text-white">What things cost</h2>
          </div>
          <div className="divide-y divide-white/5">
            {COSTS.map((c) => (
              <div
                key={c.action}
                className="flex items-center justify-between px-6 py-4 text-sm"
              >
                <span className="text-neutral-300">{c.action}</span>
                <span className="font-medium text-white">
                  {c.credits === 0 ? "Free" : `${c.credits} credits`}
                </span>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
