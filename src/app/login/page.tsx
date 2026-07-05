"use client";

import { useState } from "react";
import { Logo } from "@/components/logo";

const PERKS = [
  "One consistent AI character, unlimited ads",
  "Real voices with perfect lip-sync",
  "Static, Motion & Talking formats",
  "Export in 16:9 or 9:16 — ready to post",
];

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          mode === "signup" ? { name, email, password } : { email, password },
        ),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
      } else {
        window.location.href = "/characters";
      }
    } catch {
      setError("Could not reach the server.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center px-5 py-12 text-neutral-100">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-3xl border border-white/10 md:grid-cols-2">
        {/* Brand / marketing panel */}
        <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-violet-600/20 via-indigo-600/10 to-blue-600/20 p-10 md:flex">
          <div
            className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full blur-3xl"
            style={{ background: "radial-gradient(circle, rgba(139,92,246,0.35), transparent 70%)" }}
          />
          <a href="/" className="relative flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-orange-400 text-base font-bold text-white shadow-lg shadow-violet-500/30">
              A
            </span>
            <Logo size="lg" />
          </a>
          <div className="relative">
            <h2 className="font-display text-3xl font-semibold leading-tight">
              Your face.
              <br />
              <span className="gradient-text">Every ad.</span>
            </h2>
            <ul className="mt-6 space-y-3">
              {PERKS.map((p) => (
                <li key={p} className="flex items-start gap-2.5 text-sm text-neutral-300">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-violet-500/20 text-[11px] text-violet-300">
                    ✓
                  </span>
                  {p}
                </li>
              ))}
            </ul>
          </div>
          <p className="relative text-xs text-neutral-500">
            Powered by Veo 3.1 · Nano Banana 2 · Claude · ElevenLabs
          </p>
        </div>

        {/* Form panel */}
        <div className="glass p-8 sm:p-10">
          <a href="/" className="mb-6 flex items-center gap-2 md:hidden">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-violet-500 via-fuchsia-500 to-orange-400 text-base font-bold text-white">
              A
            </span>
            <Logo />
          </a>

          <h1 className="font-display text-2xl font-semibold">
            {mode === "login" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="mt-1 text-sm text-neutral-400">
            {mode === "login"
              ? "Log in to keep building your ads."
              : "Start with free credits — no card needed."}
          </p>

          <div className="mt-6 flex rounded-xl bg-white/5 p-1 text-sm font-medium">
            <button
              type="button"
              onClick={() => setMode("login")}
              className={`flex-1 rounded-lg py-2 transition ${mode === "login" ? "bg-white text-black shadow" : "text-neutral-400 hover:text-white"}`}
            >
              Log in
            </button>
            <button
              type="button"
              onClick={() => setMode("signup")}
              className={`flex-1 rounded-lg py-2 transition ${mode === "signup" ? "bg-white text-black shadow" : "text-neutral-400 hover:text-white"}`}
            >
              Sign up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-6">
            {mode === "signup" && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-neutral-300" htmlFor="name">
                  Name
                </label>
                <input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="mt-1.5 w-full rounded-xl border border-white/15 bg-white/5 px-3.5 py-2.5 text-sm text-white outline-none transition placeholder:text-neutral-500 focus:border-violet-400 focus:bg-white/[0.07]"
                />
              </div>
            )}

            <div className="mb-4">
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
                className="mt-1.5 w-full rounded-xl border border-white/15 bg-white/5 px-3.5 py-2.5 text-sm text-white outline-none transition placeholder:text-neutral-500 focus:border-violet-400 focus:bg-white/[0.07]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-300" htmlFor="password">
                Password
              </label>
              <div className="relative mt-1.5">
                <input
                  id="password"
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder={mode === "signup" ? "At least 6 characters" : "Your password"}
                  className="w-full rounded-xl border border-white/15 bg-white/5 px-3.5 py-2.5 pr-16 text-sm text-white outline-none transition placeholder:text-neutral-500 focus:border-violet-400 focus:bg-white/[0.07]"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-xs font-medium text-neutral-400 hover:text-white"
                >
                  {showPw ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {error && (
              <p className="mt-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="btn-primary mt-6 w-full py-3 text-sm"
            >
              {busy ? "Please wait…" : mode === "login" ? "Log in" : "Create account"}
            </button>
          </form>

          <p className="mt-5 text-center text-xs text-neutral-500">
            {mode === "login" ? "New to Ad Champ? " : "Already have an account? "}
            <button
              onClick={() => setMode(mode === "login" ? "signup" : "login")}
              className="font-medium text-violet-300 hover:text-violet-200"
            >
              {mode === "login" ? "Create one" : "Log in"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
