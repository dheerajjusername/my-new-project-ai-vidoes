"use client";

import { useEffect, useState } from "react";
import { Logo } from "@/components/logo";

export default function ResetPage() {
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("token") ?? "";
    setToken(t);
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "Something went wrong");
      else setDone(true);
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
          <h1 className="font-display text-2xl font-semibold">Set a new password</h1>
          {done ? (
            <>
              <p className="mt-4 rounded-lg bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
                Password changed! You can now log in.
              </p>
              <a href="/login" className="btn-primary mt-6 block w-full py-3 text-center text-sm">
                Go to log in
              </a>
            </>
          ) : !token ? (
            <p className="mt-4 rounded-lg bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
              This reset link is missing its token. Please use the link from your
              email, or request a new one.
            </p>
          ) : (
            <form onSubmit={submit} className="mt-6">
              <label className="block text-sm font-medium text-neutral-300" htmlFor="password">
                New password
              </label>
              <div className="relative mt-1.5">
                <input
                  id="password"
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="At least 6 characters"
                  className="w-full rounded-xl border border-white/15 bg-white/5 px-3.5 py-2.5 pr-16 text-sm text-white outline-none transition placeholder:text-neutral-500 focus:border-violet-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-xs font-medium text-neutral-400 hover:text-white"
                >
                  {showPw ? "Hide" : "Show"}
                </button>
              </div>
              {error && (
                <p className="mt-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>
              )}
              <button type="submit" disabled={busy} className="btn-primary mt-6 w-full py-3 text-sm">
                {busy ? "Saving…" : "Change password"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
