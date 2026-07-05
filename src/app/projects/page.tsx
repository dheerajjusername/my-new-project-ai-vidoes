"use client";

import { useCallback, useEffect, useState } from "react";
import { redirectIfLoggedOut } from "@/components/auth-nav";
import { SiteHeader } from "@/components/site-header";
import { VOICES, DEFAULT_VOICE } from "@/lib/voices";
import { IMAGE_STYLES, DEFAULT_IMAGE_STYLE } from "@/lib/image-styles";

type Character = { id: string; name: string; status: string };
type Project = {
  id: string;
  title: string;
  brief: string;
  format: string;
  status: string;
  character: { name: string };
  shots: { status: string }[];
};

const FORMAT_OPTIONS = [
  {
    value: "TALKING",
    label: "Talking",
    desc: "Character speaks straight to camera in one scene.",
    cost: "~30–55 credits",
  },
  {
    value: "MOTION_STORYTELLING",
    label: "Motion Storytelling",
    desc: "Character moves through scenes; voiceover narrates.",
    cost: "~80–130 credits",
  },
  {
    value: "STATIC_STORYTELLING",
    label: "Static Storytelling",
    desc: "Still images with slow motion + narration. Cheapest.",
    cost: "~55–90 credits",
  },
  {
    value: "TALKING_MICRODRAMA",
    label: "Talking Microdrama",
    desc: "Mini film — speaks AND changes scenes.",
    cost: "~80–130 credits",
  },
  {
    value: "UGC_PRODUCT_AD",
    label: "UGC Product Ad",
    desc: "Casual phone-style testimonial with a product.",
    cost: "~80–105 credits",
  },
  {
    value: "CUSTOM",
    label: "Custom",
    desc: "Describe your own idea — AI decides the shots.",
    cost: "varies",
  },
];

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [title, setTitle] = useState("");
  const [brief, setBrief] = useState("");
  const [characterId, setCharacterId] = useState("");
  const [format, setFormat] = useState("TALKING");
  const [customFormat, setCustomFormat] = useState("");
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [imageStyle, setImageStyle] = useState(DEFAULT_IMAGE_STYLE);
  const [transition, setTransition] = useState("fade");
  // Character source: pick an existing one or create a new one inline.
  const [charSource, setCharSource] = useState<"existing" | "new">("existing");
  const [newCharName, setNewCharName] = useState("");
  const [newCharMode, setNewCharMode] = useState<"describe" | "photo">("describe");
  const [newCharDesc, setNewCharDesc] = useState("");
  const [newCharPhoto, setNewCharPhoto] = useState<File | null>(null);
  const [newCharVoice, setNewCharVoice] = useState<string>(DEFAULT_VOICE);
  // UGC-specific inputs
  const [personFile, setPersonFile] = useState<File | null>(null);
  const [productFile, setProductFile] = useState<File | null>(null);
  const [ugcVoice, setUgcVoice] = useState<string>(DEFAULT_VOICE);
  const [consent, setConsent] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [projRes, charRes] = await Promise.all([
        fetch("/api/projects"),
        fetch("/api/characters"),
      ]);
      if (redirectIfLoggedOut(projRes)) return;
      if (projRes.ok) {
        setProjects((await projRes.json()).projects ?? []);
      }
      if (charRes.ok) {
        const chars: Character[] = (await charRes.json()).characters ?? [];
        setCharacters(chars.filter((c) => c.status === "READY"));
      }
    } catch {
      // server unreachable — keep current state
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function deleteProject(id: string, ptitle: string) {
    if (!confirm(`Delete project "${ptitle}" and all its shots? This can't be undone.`)) return;
    setDeletingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "Delete failed");
      await load();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setDeletingId(null);
    }
  }

  async function uploadImage(file: File): Promise<string> {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Upload failed");
    return data.url as string;
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      // UGC uses a special flow: upload person + product, composite an anchor.
      if (format === "UGC_PRODUCT_AD") {
        if (!personFile || !productFile) {
          setError("Please upload both a person photo and a product photo.");
          setCreating(false);
          return;
        }
        if (!consent) {
          setError("Please confirm you have the right to use the person's photo.");
          setCreating(false);
          return;
        }
        const [personPhotoUrl, productPhotoUrl] = await Promise.all([
          uploadImage(personFile),
          uploadImage(productFile),
        ]);
        const res = await fetch("/api/projects/ugc", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            brief,
            personPhotoUrl,
            productPhotoUrl,
            voice: ugcVoice,
            consent,
          }),
        });
        const data = await res.json();
        if (!res.ok) setError(data.error ?? "Something went wrong");
        else window.location.href = `/projects/${data.project.id}`;
        return;
      }

      // Resolve the character: either an existing one, or create a new one
      // inline (upload photo if needed, then generate its 5 reference images).
      let useCharacterId = characterId;
      if (charSource === "new") {
        if (!newCharName.trim() || (newCharMode === "describe" && !newCharDesc.trim())) {
          setError("Enter a character name and description.");
          setCreating(false);
          return;
        }
        let photoUrl: string | null = null;
        if (newCharMode === "photo") {
          if (!newCharPhoto) {
            setError("Please choose a character photo.");
            setCreating(false);
            return;
          }
          photoUrl = await uploadImage(newCharPhoto);
        }
        const charRes = await fetch("/api/characters", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: newCharName,
            description: newCharDesc,
            photoUrl,
            voice: newCharVoice,
          }),
        });
        const charData = await charRes.json();
        if (!charRes.ok) {
          setError(charData.error ?? "Character creation failed");
          setCreating(false);
          return;
        }
        useCharacterId = charData.character.id;
      }

      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, brief, characterId: useCharacterId, format, customFormat, aspectRatio, imageStyle, transition }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
      } else {
        window.location.href = `/projects/${data.project.id}`;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reach the server.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="flex-1 text-neutral-100">
      <SiteHeader active="projects" />

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-violet-600/15 via-transparent to-blue-600/10 p-6 sm:p-8">
          <div
            className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full blur-3xl"
            style={{ background: "radial-gradient(circle, rgba(139,92,246,0.3), transparent 70%)" }}
          />
          <h1 className="relative text-3xl font-semibold tracking-tight sm:text-4xl">
            Your <span className="gradient-text">projects</span>
          </h1>
          <p className="relative mt-2 max-w-xl text-neutral-400">
            Turn a brief into a scene-by-scene video ad starring one of your
            characters — pick a format, generate live, and export.
          </p>
        </div>

        <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <form
          onSubmit={handleCreate}
          className="glass rounded-2xl p-5 sm:p-8"
        >
          <h2 className="font-display text-xl font-semibold text-white">Create a new project</h2>
          <p className="mt-1 text-sm text-neutral-400">
            Set the basics, choose how it should look, then write your brief.
          </p>

          <div className="mt-6 mb-1 flex items-center gap-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-violet-300">
              ① Basics
            </span>
            <span className="h-px flex-1 bg-white/10" />
          </div>

          <label className="mt-4 block text-sm font-medium" htmlFor="title">
            Title
          </label>
          <input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="e.g. Chai Masala launch ad"
            className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none placeholder:text-neutral-500 focus:border-violet-400"
          />

          {format !== "UGC_PRODUCT_AD" && (
            <>
              <label className="mt-4 block text-sm font-medium">Character</label>
              <div className="mt-1 flex rounded-lg bg-white/5 p-1 text-sm font-medium">
                <button
                  type="button"
                  onClick={() => setCharSource("existing")}
                  className={`flex-1 rounded-md py-1.5 ${charSource === "existing" ? "bg-white text-black" : "text-neutral-400"}`}
                >
                  Use existing
                </button>
                <button
                  type="button"
                  onClick={() => setCharSource("new")}
                  className={`flex-1 rounded-md py-1.5 ${charSource === "new" ? "bg-white text-black" : "text-neutral-400"}`}
                >
                  ＋ Create new
                </button>
              </div>

              {charSource === "existing" ? (
                <>
                  <select
                    value={characterId}
                    onChange={(e) => setCharacterId(e.target.value)}
                    required
                    className="mt-2 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-violet-400"
                  >
                    <option value="">Select a character…</option>
                    {characters.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  {characters.length === 0 && (
                    <p className="mt-1 text-xs text-neutral-500">
                      No ready characters yet — switch to “Create new”.
                    </p>
                  )}
                </>
              ) : (
                <div className="mt-2 rounded-xl border border-violet-400/30 bg-violet-500/5 p-4">
                  <input
                    value={newCharName}
                    onChange={(e) => setNewCharName(e.target.value)}
                    placeholder="Character name (e.g. Priya)"
                    className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none placeholder:text-neutral-500 focus:border-violet-400"
                  />
                  <div className="mt-2 flex rounded-lg bg-white/5 p-1 text-xs font-medium">
                    <button
                      type="button"
                      onClick={() => setNewCharMode("describe")}
                      className={`flex-1 rounded-md py-1 ${newCharMode === "describe" ? "bg-white text-black" : "text-neutral-400"}`}
                    >
                      Describe
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewCharMode("photo")}
                      className={`flex-1 rounded-md py-1 ${newCharMode === "photo" ? "bg-white text-black" : "text-neutral-400"}`}
                    >
                      Upload photo
                    </button>
                  </div>
                  {newCharMode === "photo" && (
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setNewCharPhoto(e.target.files?.[0] ?? null)}
                      className="mt-2 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-neutral-300 file:mr-3 file:rounded-full file:border-0 file:bg-white/10 file:px-3 file:py-1 file:text-xs file:text-white"
                    />
                  )}
                  <textarea
                    value={newCharDesc}
                    onChange={(e) => setNewCharDesc(e.target.value)}
                    rows={2}
                    placeholder={
                      newCharMode === "photo"
                        ? "Optional extra details (e.g. wearing a blazer)"
                        : "e.g. Indian woman late 20s, black hair, warm smile, mustard kurta"
                    }
                    className="mt-2 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none placeholder:text-neutral-500 focus:border-violet-400"
                  />
                  <select
                    value={newCharVoice}
                    onChange={(e) => setNewCharVoice(e.target.value)}
                    className="mt-2 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-violet-400"
                  >
                    {VOICES.map((v) => (
                      <option key={v.id} value={v.id} className="bg-neutral-900">
                        {v.label}
                      </option>
                    ))}
                  </select>
                  <p className="mt-2 text-[11px] text-neutral-500">
                    Creating a character generates 5 reference images (25 credits, ~1 min).
                  </p>
                </div>
              )}
            </>
          )}

          <div className="mt-7 mb-1 flex items-center gap-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-violet-300">
              ② Format &amp; look
            </span>
            <span className="h-px flex-1 bg-white/10" />
          </div>

          <label className="mt-4 block text-sm font-medium">Format</label>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {FORMAT_OPTIONS.map((f) => (
              <button
                type="button"
                key={f.value}
                onClick={() => setFormat(f.value)}
                className={
                  "rounded-xl border p-3 text-left transition " +
                  (format === f.value
                    ? "border-violet-400 bg-violet-500/10"
                    : "border-white/15 bg-white/5 hover:border-white/30")
                }
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-white">{f.label}</span>
                  <span className="text-[10px] text-neutral-400">{f.cost}</span>
                </div>
                <p className="mt-1 text-xs text-neutral-400">{f.desc}</p>
              </button>
            ))}
          </div>

          {/* Aspect ratio — landscape for YouTube, portrait for Reels/Shorts */}
          <label className="mt-4 block text-sm font-medium">Video shape</label>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {[
              { value: "16:9", label: "16:9 Landscape", desc: "YouTube, website, TV" },
              { value: "9:16", label: "9:16 Portrait", desc: "Reels, Shorts, Stories" },
            ].map((a) => (
              <button
                type="button"
                key={a.value}
                onClick={() => setAspectRatio(a.value)}
                className={
                  "rounded-xl border p-3 text-left transition " +
                  (aspectRatio === a.value
                    ? "border-violet-400 bg-violet-500/10"
                    : "border-white/15 bg-white/5 hover:border-white/30")
                }
              >
                <div className="flex items-center gap-2">
                  <span
                    className={
                      "inline-block rounded-sm border border-white/40 " +
                      (a.value === "16:9" ? "h-3 w-5" : "h-5 w-3")
                    }
                  />
                  <span className="text-sm font-medium text-white">{a.label}</span>
                </div>
                <p className="mt-1 text-xs text-neutral-400">{a.desc}</p>
              </button>
            ))}
          </div>

          {/* Image style — the look of every generated image/frame */}
          <label className="mt-4 block text-sm font-medium">Image style</label>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {IMAGE_STYLES.map((s) => (
              <button
                type="button"
                key={s.id}
                onClick={() => setImageStyle(s.id)}
                className={
                  "rounded-xl border px-3 py-2 text-left text-sm transition " +
                  (imageStyle === s.id
                    ? "border-violet-400 bg-violet-500/10 text-white"
                    : "border-white/15 bg-white/5 text-neutral-300 hover:border-white/30")
                }
              >
                <span className="mr-1">{s.emoji}</span>
                {s.label}
              </button>
            ))}
          </div>
          <p className="mt-1 text-xs text-neutral-500">
            Character ka chehra reference photos se hi aayega — style sirf look
            badalti hai (real, anime, cartoon, Pixar, etc.).
          </p>

          {/* Transition between clips — for Static & Motion Storytelling */}
          {(format === "STATIC_STORYTELLING" || format === "MOTION_STORYTELLING") && (
            <>
              <label className="mt-4 block text-sm font-medium">
                Transition (images ke beech)
              </label>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {[
                  { value: "fade", label: "Fade", desc: "Kaale me soft dip" },
                  { value: "fadewhite", label: "Flash", desc: "Safed flash" },
                  { value: "cut", label: "Cut", desc: "Sharp, no fade" },
                  { value: "mix", label: "Mix 🎲", desc: "Saare bari-bari" },
                ].map((t) => (
                  <button
                    type="button"
                    key={t.value}
                    onClick={() => setTransition(t.value)}
                    className={
                      "rounded-xl border px-3 py-2 text-left text-sm transition " +
                      (transition === t.value
                        ? "border-violet-400 bg-violet-500/10 text-white"
                        : "border-white/15 bg-white/5 text-neutral-300 hover:border-white/30")
                    }
                  >
                    <div className="font-medium">{t.label}</div>
                    <p className="mt-0.5 text-[11px] text-neutral-400">{t.desc}</p>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* UGC-specific inputs: person + product photos + consent */}
          {format === "UGC_PRODUCT_AD" && (
            <div className="mt-4 rounded-xl border border-violet-400/30 bg-violet-500/5 p-4">
              <p className="text-xs text-neutral-300">
                Upload a photo of the person and a photo of the product — we&apos;ll
                combine them so the person is holding the product in the ad.
              </p>

              <label className="mt-3 block text-sm font-medium" htmlFor="person">
                Person photo
              </label>
              <input
                id="person"
                type="file"
                accept="image/*"
                onChange={(e) => setPersonFile(e.target.files?.[0] ?? null)}
                className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-neutral-300 file:mr-3 file:rounded-full file:border-0 file:bg-white/10 file:px-3 file:py-1 file:text-xs file:text-white"
              />

              <label className="mt-3 block text-sm font-medium" htmlFor="product">
                Product photo
              </label>
              <input
                id="product"
                type="file"
                accept="image/*"
                onChange={(e) => setProductFile(e.target.files?.[0] ?? null)}
                className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-neutral-300 file:mr-3 file:rounded-full file:border-0 file:bg-white/10 file:px-3 file:py-1 file:text-xs file:text-white"
              />

              <label className="mt-3 block text-sm font-medium" htmlFor="ugcVoice">
                Voice
              </label>
              <select
                id="ugcVoice"
                value={ugcVoice}
                onChange={(e) => setUgcVoice(e.target.value)}
                className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-violet-400"
              >
                {VOICES.map((v) => (
                  <option key={v.id} value={v.id} className="bg-neutral-900">
                    {v.label}
                  </option>
                ))}
              </select>

              <label className="mt-3 flex items-start gap-2 text-xs text-neutral-300">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="mt-0.5"
                />
                I have the right to use this person&apos;s photo.
              </label>
            </div>
          )}

          {format === "CUSTOM" && (
            <>
              <label className="mt-4 block text-sm font-medium" htmlFor="customFormat">
                Describe your format
              </label>
              <input
                id="customFormat"
                value={customFormat}
                onChange={(e) => setCustomFormat(e.target.value)}
                required
                placeholder="e.g. 3 quick cuts with a cliffhanger ending"
                className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none placeholder:text-neutral-500 focus:border-violet-400"
              />
            </>
          )}

          <div className="mt-7 mb-1 flex items-center gap-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-violet-300">
              ③ Your brief
            </span>
            <span className="h-px flex-1 bg-white/10" />
          </div>

          <label className="mt-4 block text-sm font-medium" htmlFor="brief">
            Brief — what are you advertising?
          </label>
          <textarea
            id="brief"
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            required
            rows={4}
            placeholder="e.g. A new masala chai brand called 'Garam Adrak' — homemade taste, ready in 2 minutes, for busy young professionals"
            className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none placeholder:text-neutral-500 focus:border-violet-400"
          />

          <button
            type="submit"
            disabled={
              creating ||
              (format !== "UGC_PRODUCT_AD" &&
                charSource === "existing" &&
                characters.length === 0)
            }
            className="btn-primary mt-7 px-6 py-3 text-sm"
          >
            {creating
              ? format === "UGC_PRODUCT_AD"
                ? "Building UGC ad…"
                : charSource === "new"
                  ? "Creating character & project…"
                  : "Creating…"
              : "Create project →"}
          </button>
          {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
        </form>

        {/* Helper sidebar — fills the space on desktop, hidden on mobile */}
        <aside className="hidden lg:block">
          <div className="glass sticky top-24 rounded-2xl p-5">
            <h3 className="font-display text-sm font-semibold text-white">
              How a project works
            </h3>
            <ol className="mt-4 space-y-3 text-sm text-neutral-400">
              {[
                "Pick or create your character",
                "Choose a format, shape & art style",
                "Write a short brief about your ad",
                "Generate shots live — regenerate any you don't like",
                "Add a voiceover, then stitch the final video",
              ].map((t, i) => (
                <li key={i} className="flex gap-3">
                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-violet-500/15 text-[11px] font-semibold text-violet-300">
                    {i + 1}
                  </span>
                  {t}
                </li>
              ))}
            </ol>
            <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs text-neutral-400">
              💡 <b className="text-neutral-200">Tip:</b> Static Storytelling is the
              cheapest way to test an idea. Use Motion or Talking for premium ads.
            </div>
          </div>
        </aside>
        </div>

        <div className="mt-12 space-y-4">
          {projects.length === 0 && (
            <p className="text-sm text-neutral-500">
              No projects yet — create your first one above.
            </p>
          )}
          {projects.map((p) => (
            <div
              key={p.id}
              className="glass flex items-center justify-between rounded-2xl p-5"
            >
              <a href={`/projects/${p.id}`} className="min-w-0 flex-1 hover:opacity-90">
                <h3 className="font-medium text-white">{p.title}</h3>
                <p className="mt-1 text-sm text-neutral-400">
                  {p.character.name} · {p.format.replaceAll("_", " ").toLowerCase()} ·{" "}
                  {p.shots.length} shot{p.shots.length === 1 ? "" : "s"}
                </p>
              </a>
              <div className="ml-4 flex shrink-0 items-center gap-3">
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-neutral-300">
                  {p.status.replaceAll("_", " ")}
                </span>
                <button
                  onClick={() => deleteProject(p.id, p.title)}
                  disabled={deletingId === p.id}
                  title="Delete project"
                  className="rounded-full border border-white/15 px-3 py-1 text-xs text-neutral-400 hover:border-red-400/40 hover:text-red-300 disabled:opacity-50"
                >
                  {deletingId === p.id ? "Deleting…" : "Delete"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
