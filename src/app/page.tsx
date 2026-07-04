import { AuthNav } from "@/components/auth-nav";

const FORMATS = [
  { name: "Talking", description: "Single scene — your character speaks directly to camera." },
  { name: "Motion Storytelling", description: "Multi-shot story with your character moving through scenes." },
  { name: "Static Storytelling", description: "Narrated story told over still, cinematic shots." },
  { name: "Talking Microdrama", description: "Short dramatic dialogue-driven scenes, mini episode style." },
  { name: "UGC Product Ad", description: "Casual, creator-style ad featuring your character with a product." },
  { name: "Custom", description: "Describe your own format — the shot list adapts to your idea." },
];

const STEPS = [
  {
    title: "Create a character",
    description:
      "Describe your character once. We generate 5 reference images from different angles to keep the face consistent everywhere.",
  },
  {
    title: "Start a project",
    description:
      "Tell us what you're advertising and pick a format. AI turns your brief into a scene-by-scene shot list.",
  },
  {
    title: "Generate shots",
    description:
      "Each shot is generated with Veo using your character's reference images, so the face never drifts.",
  },
  {
    title: "Voice & stitch",
    description:
      "ElevenLabs adds a real voice with lip-sync, then everything is stitched into one finished video ad.",
  },
];

const MODELS = ["Veo 3.1 Lite", "Nano Banana 2", "Claude", "ElevenLabs", "VEED Lipsync"];

export default function Home() {
  return (
    <div className="flex-1 text-neutral-100">
      {/* Nav */}
      <header className="sticky top-0 z-20 border-b border-white/10 bg-black/30 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <span className="flex items-center gap-2 text-lg font-semibold tracking-tight">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-violet-500 to-blue-500 text-sm font-bold text-white">
              A
            </span>
            Ad Champ
          </span>
          <nav className="hidden gap-8 text-sm text-neutral-400 sm:flex">
            <a href="#how-it-works" className="hover:text-white">How it works</a>
            <a href="#formats" className="hover:text-white">Formats</a>
            <a href="#tech" className="hover:text-white">Models</a>
          </nav>
          <AuthNav />
        </div>
      </header>

      {/* Hero */}
      <section className="relative mx-auto max-w-6xl px-6 pt-24 pb-28 text-center sm:pt-32">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-medium text-neutral-300">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          AI-native video ad studio
        </span>
        <h1 className="mx-auto mt-8 max-w-4xl text-5xl font-semibold leading-[1.05] tracking-tight sm:text-7xl">
          One AI character.
          <br />
          <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-blue-400 bg-clip-text text-transparent">
            Unlimited video ads.
          </span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-neutral-400">
          Build a consistent AI character once, then reuse it across as many video
          ads as you want — same face, real voice, perfect lip-sync, every shot.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <a
            href="/characters"
            className="rounded-full bg-white px-7 py-3.5 text-sm font-semibold text-black transition hover:bg-neutral-200"
          >
            Create your character
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
                className="glass rounded-2xl p-6 transition hover:border-white/20"
              >
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-blue-500 text-sm font-bold text-white">
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
                className="glass rounded-2xl p-6 transition hover:border-white/20"
              >
                <h3 className="font-medium text-white">{format.name}</h3>
                <p className="mt-2 text-sm text-neutral-400">{format.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tech / CTA */}
      <section id="tech" className="border-t border-white/10">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <div className="glass overflow-hidden rounded-3xl px-8 py-16 text-center">
            <h2 className="mx-auto max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
              Ready to make your first ad?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-neutral-400">
              Create a character and generate a full, voiced, lip-synced video ad in minutes.
            </p>
            <a
              href="/characters"
              className="mt-8 inline-block rounded-full bg-white px-7 py-3.5 text-sm font-semibold text-black transition hover:bg-neutral-200"
            >
              Get started
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-10 text-sm text-neutral-500 sm:flex-row">
          <span>Ad Champ — AI video ads platform.</span>
          <div className="flex gap-6">
            <a href="/characters" className="hover:text-white">Characters</a>
            <a href="/projects" className="hover:text-white">Projects</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
