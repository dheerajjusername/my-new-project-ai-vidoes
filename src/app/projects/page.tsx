"use client";

import { useCallback, useEffect, useState } from "react";
import { redirectIfLoggedOut } from "@/components/auth-nav";
import { SiteHeader } from "@/components/site-header";

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

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, brief, characterId, format, customFormat }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
      } else {
        window.location.href = `/projects/${data.project.id}`;
      }
    } catch {
      setError("Could not reach the server.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="flex-1 text-neutral-100">
      <SiteHeader active="projects" />

      <main className="mx-auto max-w-6xl px-6 py-12">
        <h1 className="text-3xl font-semibold tracking-tight">Your projects</h1>
        <p className="mt-2 text-neutral-400">
          A project turns your brief into a scene-by-scene video ad starring one
          of your characters.
        </p>

        <form
          onSubmit={handleCreate}
          className="mt-8 max-w-xl glass rounded-2xl p-6"
        >
          <h2 className="font-medium text-white">Create a new project</h2>

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

          <label className="mt-4 block text-sm font-medium" htmlFor="character">
            Character
          </label>
          <select
            id="character"
            value={characterId}
            onChange={(e) => setCharacterId(e.target.value)}
            required
            className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none placeholder:text-neutral-500 focus:border-violet-400"
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
              No ready characters yet —{" "}
              <a href="/characters" className="underline">
                create one first
              </a>
              .
            </p>
          )}

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
            disabled={creating || characters.length === 0}
            className="mt-5 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black hover:bg-neutral-200 disabled:opacity-50"
          >
            {creating ? "Creating…" : "Create project"}
          </button>
          {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
        </form>

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
