"use client";

import { useCallback, useEffect, useState } from "react";

type Character = {
  id: string;
  name: string;
  description: string;
  referenceImages: string[];
  status: "PENDING" | "GENERATING" | "READY" | "FAILED";
  createdAt: string;
};

export default function CharactersPage() {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCharacters = useCallback(async () => {
    try {
      const res = await fetch("/api/characters");
      if (!res.ok) return;
      const data = await res.json();
      setCharacters(data.characters ?? []);
    } catch {
      // Server not reachable yet — keep the empty list.
    }
  }, []);

  useEffect(() => {
    loadCharacters();
  }, [loadCharacters]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/characters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
      } else {
        setName("");
        setDescription("");
        await loadCharacters();
      }
    } catch {
      setError("Could not reach the server. Is the database configured?");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="flex-1 bg-white text-neutral-900">
      <header className="border-b border-neutral-200">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <a href="/" className="text-lg font-semibold tracking-tight">
            Ad Champ
          </a>
          <nav className="text-sm text-neutral-600">
            <span className="font-medium text-neutral-900">Characters</span>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-12">
        <h1 className="text-3xl font-semibold tracking-tight">Your characters</h1>
        <p className="mt-2 text-neutral-600">
          Describe a character once — we generate 5 reference images from
          different angles so the face stays consistent in every video.
        </p>

        {/* Create form */}
        <form
          onSubmit={handleCreate}
          className="mt-8 max-w-xl rounded-xl border border-neutral-200 p-6"
        >
          <h2 className="font-medium">Create a new character</h2>
          <label className="mt-4 block text-sm font-medium" htmlFor="name">
            Name
          </label>
          <input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="e.g. Priya"
            className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
          />
          <label className="mt-4 block text-sm font-medium" htmlFor="description">
            Description
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            rows={4}
            placeholder="e.g. Indian woman in her late 20s, shoulder-length black hair, warm smile, wearing a mustard yellow kurta"
            className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
          />
          <button
            type="submit"
            disabled={creating}
            className="mt-5 rounded-full bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
          >
            {creating ? "Generating 5 reference images…" : "Create character"}
          </button>
          {creating && (
            <p className="mt-3 text-sm text-neutral-500">
              This takes about a minute — we generate a base portrait, then 4
              more angles from it.
            </p>
          )}
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        </form>

        {/* Character list */}
        <div className="mt-12 space-y-8">
          {characters.length === 0 && (
            <p className="text-sm text-neutral-500">
              No characters yet — create your first one above.
            </p>
          )}
          {characters.map((c) => (
            <div key={c.id} className="rounded-xl border border-neutral-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">{c.name}</h3>
                  <p className="mt-1 max-w-2xl text-sm text-neutral-600">
                    {c.description}
                  </p>
                </div>
                <span
                  className={
                    "rounded-full px-3 py-1 text-xs font-medium " +
                    (c.status === "READY"
                      ? "bg-green-100 text-green-800"
                      : c.status === "FAILED"
                        ? "bg-red-100 text-red-800"
                        : "bg-amber-100 text-amber-800")
                  }
                >
                  {c.status}
                </span>
              </div>
              {c.referenceImages.length > 0 && (
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
                  {c.referenceImages.map((url, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={url}
                      src={url}
                      alt={`${c.name} reference ${i + 1}`}
                      className="aspect-[3/4] w-full rounded-lg border border-neutral-200 object-cover"
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
