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
  { value: "TALKING", label: "Talking (single scene)" },
  { value: "MOTION_STORYTELLING", label: "Motion Storytelling" },
  { value: "STATIC_STORYTELLING", label: "Static Storytelling" },
  { value: "TALKING_MICRODRAMA", label: "Talking Microdrama" },
  { value: "UGC_PRODUCT_AD", label: "UGC Product Ad" },
  { value: "CUSTOM", label: "Custom format" },
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

          <label className="mt-4 block text-sm font-medium" htmlFor="format">
            Format
          </label>
          <select
            id="format"
            value={format}
            onChange={(e) => setFormat(e.target.value)}
            className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none placeholder:text-neutral-500 focus:border-violet-400"
          >
            {FORMAT_OPTIONS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>

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
            <a
              key={p.id}
              href={`/projects/${p.id}`}
              className="block glass rounded-2xl p-5 hover:border-neutral-400"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-white">{p.title}</h3>
                  <p className="mt-1 text-sm text-neutral-400">
                    {p.character.name} · {p.format.replaceAll("_", " ").toLowerCase()} ·{" "}
                    {p.shots.length} shot{p.shots.length === 1 ? "" : "s"}
                  </p>
                </div>
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-neutral-300">
                  {p.status.replaceAll("_", " ")}
                </span>
              </div>
            </a>
          ))}
        </div>
      </main>
    </div>
  );
}
