const FORMATS = [
  {
    name: "Talking",
    description: "Single scene — your character speaks directly to camera.",
  },
  {
    name: "Motion Storytelling",
    description: "Multi-shot story with your character moving through scenes.",
  },
  {
    name: "Static Storytelling",
    description: "Narrated story told over still, cinematic shots.",
  },
  {
    name: "Talking Microdrama",
    description: "Short dramatic dialogue-driven scenes, mini episode style.",
  },
  {
    name: "UGC Product Ad",
    description: "Casual, creator-style ad featuring your character with a product.",
  },
  {
    name: "Custom",
    description: "Describe your own format — the shot list adapts to your idea.",
  },
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
      "Tell us what you're advertising and pick a format. Claude turns your brief into a scene-by-scene shot list.",
  },
  {
    title: "Generate shots",
    description:
      "Each shot is generated independently with Veo, using your character's reference images so the face never drifts.",
  },
  {
    title: "Add voice & stitch",
    description:
      "ElevenLabs adds voiceover, then FFmpeg stitches every shot into one finished video ad.",
  },
];

export default function Home() {
  return (
    <div className="flex-1 bg-white text-neutral-900">
      {/* Nav */}
      <header className="border-b border-neutral-200">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <span className="text-lg font-semibold tracking-tight">AdCharacter</span>
          <nav className="hidden gap-8 text-sm text-neutral-600 sm:flex">
            <a href="#how-it-works" className="hover:text-neutral-900">
              How it works
            </a>
            <a href="#formats" className="hover:text-neutral-900">
              Formats
            </a>
          </nav>
          <a
            href="/characters"
            className="rounded-full bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700"
          >
            Get started
          </a>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 py-24 text-center sm:py-32">
        <h1 className="mx-auto max-w-3xl text-4xl font-semibold tracking-tight sm:text-6xl">
          One AI character. Unlimited video ads.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-neutral-600">
          Build a consistent AI character once, then reuse it across as many
          video ads as you want — same face, every shot, every video.
        </p>
        <div className="mt-10 flex justify-center gap-4">
          <a
            href="/characters"
            className="rounded-full bg-neutral-900 px-6 py-3 text-sm font-medium text-white hover:bg-neutral-700"
          >
            Create your character
          </a>
          <a
            href="#how-it-works"
            className="rounded-full border border-neutral-300 px-6 py-3 text-sm font-medium hover:bg-neutral-50"
          >
            See how it works
          </a>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="border-t border-neutral-200 bg-neutral-50">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <h2 className="text-3xl font-semibold tracking-tight">How it works</h2>
          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, i) => (
              <div key={step.title}>
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-900 text-sm font-medium text-white">
                  {i + 1}
                </div>
                <h3 className="mt-4 font-medium">{step.title}</h3>
                <p className="mt-2 text-sm text-neutral-600">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Formats */}
      <section id="formats" className="border-t border-neutral-200">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <h2 className="text-3xl font-semibold tracking-tight">Video formats</h2>
          <p className="mt-3 text-neutral-600">
            Pick a format for your project — or describe your own.
          </p>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FORMATS.map((format) => (
              <div
                key={format.name}
                className="rounded-xl border border-neutral-200 p-6 hover:border-neutral-300"
              >
                <h3 className="font-medium">{format.name}</h3>
                <p className="mt-2 text-sm text-neutral-600">
                  {format.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-neutral-200">
        <div className="mx-auto max-w-6xl px-6 py-10 text-sm text-neutral-500">
          AdCharacter — AI video ads platform.
        </div>
      </footer>
    </div>
  );
}
