import { AuthNav } from "@/components/auth-nav";
import { Logo } from "@/components/logo";
import { FounderAvatar } from "@/components/founder-avatar";

const FORMATS = [
  { icon: "🎤", name: "Talking", description: "Characters speak on screen with real lip-sync — one scene, full dialogue." },
  { icon: "🎬", name: "Motion Storytelling", description: "AI-cut video clips that change with the voiceover, timed to every line." },
  { icon: "🖼️", name: "Static Storytelling", description: "Narrated story over still cinematic shots with Ken Burns motion. Cheapest." },
  { icon: "🎭", name: "Talking Microdrama", description: "Short dramatic dialogue-driven scenes, mini-episode style." },
  { icon: "📱", name: "UGC Product Ad", description: "Casual, creator-style ad featuring your character holding a product." },
  { icon: "✨", name: "Custom", description: "Describe your own format — the shot list adapts to your idea." },
];

const STEPS = [
  {
    title: "Create a character",
    description:
      "Describe your character once. We generate reference images from different angles so the face stays consistent everywhere.",
  },
  {
    title: "Start a project",
    description:
      "Tell us what you're advertising and pick a format, aspect ratio and art style. AI plans it scene by scene.",
  },
  {
    title: "Generate live",
    description:
      "Watch each shot appear. Regenerate or delete any you don't like — you stay in control the whole way.",
  },
  {
    title: "Voice & stitch",
    description:
      "Add a real voiceover, then everything is timed to the words and stitched into one finished video ad.",
  },
];

const WHY = [
  { stat: "1", label: "character, unlimited ads — the face never drifts" },
  { stat: "9:16 / 16:9", label: "export for Reels, Shorts, YouTube or web" },
  { stat: "20+", label: "natural voices across Indian & world languages" },
];

const MODELS = ["Veo 3.1 Lite", "Nano Banana 2", "Claude", "ElevenLabs", "VEED Lipsync"];

export default function Home() {
  return (
    <div className="flex-1 text-neutral-100">
      {/* Nav */}
      <header className="sticky top-0 z-20 border-b border-white/10 bg-black/40 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
          <a href="/" className="flex items-center">
            <Logo />
          </a>
          <nav className="hidden gap-7 text-sm text-neutral-400 sm:flex">
            <a href="#how-it-works" className="hover:text-white">How it works</a>
            <a href="#formats" className="hover:text-white">Formats</a>
            <a href="#founder" className="hover:text-white">Founder</a>
          </nav>
          <AuthNav />
        </div>
      </header>

      {/* Hero */}
      <section className="relative mx-auto max-w-6xl px-6 pt-24 pb-28 text-center sm:pt-32">
        <span className="animate-in inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-medium text-neutral-300">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
          </span>
          AI-native video ad studio
        </span>
        <h1 className="animate-in mx-auto mt-8 max-w-4xl text-5xl font-semibold leading-[1.04] tracking-tight sm:text-7xl">
          One AI character.
          <br />
          <span className="gradient-text">Unlimited video ads.</span>
        </h1>
        <p className="animate-in mx-auto mt-6 max-w-2xl text-lg text-neutral-400">
          Build a consistent AI character once, then reuse it across as many video
          ads as you want — same face, real voice, perfect timing, every shot.
        </p>
        <div className="animate-in mt-10 flex flex-wrap justify-center gap-4">
          <a href="/characters" className="btn-primary px-7 py-3.5 text-sm">
            Create your character →
          </a>
          <a
            href="#how-it-works"
            className="rounded-full border border-white/20 px-7 py-3.5 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            See how it works
          </a>
        </div>

        {/* Model strip */}
        <div className="mt-16 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs uppercase tracking-widest text-neutral-500">
          <span className="text-neutral-600">Powered by</span>
          {MODELS.map((m) => (
            <span key={m} className="text-neutral-400">{m}</span>
          ))}
        </div>
      </section>

      {/* Showcase — real AI-generated ads playing in phone mockups */}
      <section className="border-t border-white/10">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-violet-300">
              See it in action
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              Real ads, made on Ad Champ
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-neutral-400">
              Every clip below was generated end-to-end — one character, real
              voice, synced to the words. No camera, no crew.
            </p>
          </div>

          <div className="mt-14 flex flex-wrap items-center justify-center gap-8 sm:gap-10">
            {[
              { src: "/showcase/anime-chai.mp4", label: "Static · Anime", tint: "from-fuchsia-500/30" },
              { src: "/showcase/motion-priya.mp4", label: "Motion · Realistic", tint: "from-violet-500/30", lift: true },
              { src: "/showcase/anime-priya.mp4", label: "Static · Anime", tint: "from-blue-500/30" },
            ].map((v) => (
              <div key={v.src} className={"relative " + (v.lift ? "sm:-translate-y-6" : "")}>
                <div
                  className={`pointer-events-none absolute -inset-5 rounded-[3rem] bg-gradient-to-b ${v.tint} to-transparent blur-2xl`}
                />
                <div className="relative w-[190px] overflow-hidden rounded-[2rem] border-[6px] border-neutral-800 bg-black shadow-2xl shadow-black/60 sm:w-[210px]">
                  <video
                    src={v.src}
                    autoPlay
                    muted
                    loop
                    playsInline
                    preload="metadata"
                    className="aspect-[9/16] w-full object-cover"
                  />
                  <span className="absolute bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-black/60 px-3 py-1 text-[11px] font-medium text-white backdrop-blur">
                    {v.label}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-14 text-center">
            <a href="/characters" className="btn-primary px-7 py-3.5 text-sm">
              Make one like these →
            </a>
          </div>
        </div>
      </section>

      {/* Why */}
      <section className="border-t border-white/10">
        <div className="mx-auto grid max-w-6xl gap-6 px-6 py-16 sm:grid-cols-3">
          {WHY.map((w) => (
            <div key={w.label} className="glass rounded-2xl p-6">
              <div className="gradient-text font-display text-3xl font-semibold">{w.stat}</div>
              <p className="mt-2 text-sm text-neutral-400">{w.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="border-t border-white/10">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">How it works</h2>
          <p className="mt-3 max-w-2xl text-neutral-400">
            A structured production pipeline — not random one-off prompts.
          </p>
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, i) => (
              <div
                key={step.title}
                className="glass rounded-2xl p-6 transition hover:-translate-y-1 hover:border-white/20"
              >
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-blue-500 text-sm font-bold text-white shadow-lg shadow-violet-500/25">
                  {i + 1}
                </div>
                <h3 className="mt-5 font-medium text-white">{step.title}</h3>
                <p className="mt-2 text-sm text-neutral-400">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Formats */}
      <section id="formats" className="border-t border-white/10">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Video formats</h2>
          <p className="mt-3 text-neutral-400">Pick a format for your project — or describe your own.</p>
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FORMATS.map((format) => (
              <div
                key={format.name}
                className="glass rounded-2xl p-6 transition hover:-translate-y-1 hover:border-white/20"
              >
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-white/5 text-xl">
                  {format.icon}
                </div>
                <h3 className="mt-4 font-medium text-white">{format.name}</h3>
                <p className="mt-2 text-sm text-neutral-400">{format.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="tech" className="border-t border-white/10">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <div className="glass relative overflow-hidden rounded-3xl px-8 py-16 text-center">
            <div
              className="pointer-events-none absolute inset-x-0 -top-24 mx-auto h-48 w-[36rem] max-w-full blur-3xl"
              style={{ background: "radial-gradient(circle, rgba(139,92,246,0.28), transparent 70%)" }}
            />
            <h2 className="relative mx-auto max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
              Ready to make your first ad?
            </h2>
            <p className="relative mx-auto mt-4 max-w-xl text-neutral-400">
              Create a character and generate a full, voiced video ad in minutes.
            </p>
            <a href="/characters" className="btn-primary relative mt-8 px-7 py-3.5 text-sm">
              Get started free →
            </a>
          </div>
        </div>
      </section>

      {/* Founder */}
      <section id="founder" className="border-t border-white/10">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <p className="text-center text-xs font-semibold uppercase tracking-widest text-violet-300">
            Meet the founder
          </p>
          <div className="mx-auto mt-6 flex max-w-lg flex-col items-center gap-5 text-center">
            <FounderAvatar size={168} />
            <div>
              <h3 className="font-display text-xl font-semibold text-white">Dheeraj Yadav</h3>
              <p className="mt-1 text-sm text-neutral-400">Founder &amp; Builder, Ad Champ</p>
            </div>
            <p className="max-w-md text-sm text-neutral-400">
              Building Ad Champ so anyone can create studio-quality AI video ads —
              no camera, no crew, no editing skills. Just your idea.
            </p>
            <a
              href="https://www.linkedin.com/in/dheerajjyadav"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-white/20 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-white/10"
            >
              <span className="grid h-5 w-5 place-items-center rounded bg-[#0a66c2] text-[11px] font-bold text-white">
                in
              </span>
              Connect on LinkedIn
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-6 py-10 text-sm text-neutral-500 sm:flex-row">
          <a href="/" className="flex items-center gap-2">
            <Logo size="sm" />
            <span className="text-neutral-500">— AI video ads platform</span>
          </a>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            <a href="/characters" className="hover:text-white">Characters</a>
            <a href="/projects" className="hover:text-white">Projects</a>
            <a href="/credits" className="hover:text-white">Credits</a>
            <a
              href="https://www.linkedin.com/in/dheerajjyadav"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white"
            >
              LinkedIn
            </a>
          </div>
        </div>
        <p className="pb-8 text-center text-xs text-neutral-600">
          © {new Date().getFullYear()} Ad Champ · Built by Dheeraj Yadav
        </p>
      </footer>
    </div>
  );
}
