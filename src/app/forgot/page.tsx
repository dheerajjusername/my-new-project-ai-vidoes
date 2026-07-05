"use client";

import { useState } from "react";
import { Logo } from "@/components/logo";

export default function ForgotPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMsg(null);
    try {
      const res = await fetch("/api/auth/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "Something went wrong");
      else setMsg(data.message ?? "If that email has an account, a reset link is on its way.");
    } catch {
      setError("Could not reach the server.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center px-5 py-16 text-neutral-100">
      <div className="w-full max-w-sm">
        <a href="/" className="flex justify-center">
          <Logo size="lg" />
        </a>
        <div className="glass mt-8 rounded-2xl p-6 sm:p-8">
          <h1 className="font-display text-2xl font-semibold">Forgot password</h1>
          <p className="mt-1 text-sm text-neutral-400">
            Enter your email and we&apos;ll send you a reset link.
          </p>
          {msg ? (
            <p className="mt-6 rounded-lg bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
              {msg}
            </p>
          ) : (
            <form onSubmit={submit} className="mt-6">
              <label className="block text-sm font-medium text-neutral-300" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="mt-1.5 w-full rounded-xl border border-white/15 bg-white/5 px-3.5 py-2.5 text-sm text-white outline-none transition placeholder:text-neutral-500 focus:border-violet-400"
              />
              {error && (
                <p className="mt-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>
              )}
              <button type="submit" disabled={busy} className="btn-primary mt-6 w-full py-3 text-sm">
                {busy ? "Sending…" : "Send reset link"}
              </button>
            </form>
          )}
          <p className="mt-5 text-center text-xs text-neutral-500">
            <a href="/login" className="font-medium text-violet-300 hover:text-violet-200">
              ← Back to log in
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
