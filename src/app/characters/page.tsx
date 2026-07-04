"use client";

import { useCallback, useEffect, useState } from "react";
import { redirectIfLoggedOut } from "@/components/auth-nav";
import { SiteHeader } from "@/components/site-header";

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
  const [mode, setMode] = useState<"describe" | "photo">("describe");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCharacters = useCallback(async () => {
    try {
      const res = await fetch("/api/characters");
      if (redirectIfLoggedOut(res)) return;
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

  function onPickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setPhotoFile(file);
    setPhotoPreview(file ? URL.createObjectURL(file) : null);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      let photoUrl: string | null = null;

      // Photo mode: upload the image first, then create from its URL.
      if (mode === "photo") {
        if (!photoFile) {
          setError("Please choose a photo.");
          setCreating(false);
          return;
        }
        const fd = new FormData();
        fd.append("file", photoFile);
        const up = await fetch("/api/upload", { method: "POST", body: fd });
        const upData = await up.json();
        if (!up.ok) {
          setError(upData.error ?? "Photo upload failed");
          setCreating(false);
          return;
        }
        photoUrl = upData.url;
      }

      const res = await fetch("/api/characters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, photoUrl }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
      } else {
        setName("");
        setDescription("");
        setPhotoFile(null);
        setPhotoPreview(null);
        await loadCharacters();
      }
    } catch {
      setError("Could not reach the server. Is the database configured?");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="flex-1 text-neutral-100">
      <SiteHeader active="characters" />

      <main className="mx-auto max-w-6xl px-6 py-12">
        <h1 className="text-3xl font-semibold tracking-tight">Your characters</h1>
        <p className="mt-2 text-neutral-400">
          Create a character from a text description or a real photo — we
          generate 5 reference images from different angles so the face stays
          consistent in every video.
        </p>

        {/* Create form */}
        <form
          onSubmit={handleCreate}
          className="mt-8 max-w-xl glass rounded-2xl p-6"
        >
          <h2 className="font-medium">Create a new character</h2>

          {/* Mode toggle */}
          <div className="mt-4 flex rounded-lg bg-white/5 p-1 text-sm font-medium">
            <button
              type="button"
              onClick={() => setMode("describe")}
              className={`flex-1 rounded-md py-1.5 ${mode === "describe" ? "bg-white text-black" : "text-neutral-400"}`}
            >
              Describe
            </button>
            <button
              type="button"
              onClick={() => setMode("photo")}
              className={`flex-1 rounded-md py-1.5 ${mode === "photo" ? "bg-white text-black" : "text-neutral-400"}`}
            >
              Upload a photo
            </button>
          </div>

          <label className="mt-4 block text-sm font-medium" htmlFor="name">
            Name
          </label>
          <input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="e.g. Priya"
            className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none placeholder:text-neutral-500 focus:border-violet-400"
          />

          {mode === "photo" && (
            <>
              <label className="mt-4 block text-sm font-medium" htmlFor="photo">
                Photo of the person
              </label>
              <input
                id="photo"
                type="file"
                accept="image/*"
                onChange={onPickPhoto}
                className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-neutral-300 file:mr-3 file:rounded-full file:border-0 file:bg-white/10 file:px-3 file:py-1 file:text-xs file:text-white"
              />
              {photoPreview && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={photoPreview}
                  alt="preview"
                  className="mt-3 h-28 w-28 rounded-lg border border-white/10 object-cover"
                />
              )}
            </>
          )}

          <label className="mt-4 block text-sm font-medium" htmlFor="description">
            Description{" "}
            {mode === "photo" && (
              <span className="font-normal text-neutral-500">(optional — extra details)</span>
            )}
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required={mode === "describe"}
            rows={4}
            placeholder={
              mode === "photo"
                ? "e.g. wearing a formal blazer, confident expression"
                : "e.g. Indian woman in her late 20s, shoulder-length black hair, warm smile, wearing a mustard yellow kurta"
            }
            className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none placeholder:text-neutral-500 focus:border-violet-400"
          />
          <button
            type="submit"
            disabled={creating}
            className="mt-5 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black hover:bg-neutral-200 disabled:opacity-50"
          >
            {creating
              ? "Generating 5 reference images…"
              : "Create character (25 credits)"}
          </button>
          {creating && (
            <p className="mt-3 text-sm text-neutral-500">
              This takes about a minute — we generate a base portrait, then 4
              more angles from it.
            </p>
          )}
          {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
        </form>

        {/* Character list */}
        <div className="mt-12 space-y-8">
          {characters.length === 0 && (
            <p className="text-sm text-neutral-500">
              No characters yet — create your first one above.
            </p>
          )}
          {characters.map((c) => (
            <div key={c.id} className="glass rounded-2xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-white">{c.name}</h3>
                  <p className="mt-1 max-w-2xl text-sm text-neutral-400">
                    {c.description}
                  </p>
                </div>
                <span
                  className={
                    "rounded-full px-3 py-1 text-xs font-medium " +
                    (c.status === "READY"
                      ? "bg-emerald-500/15 text-emerald-300"
                      : c.status === "FAILED"
                        ? "bg-red-500/15 text-red-300"
                        : "bg-amber-500/15 text-amber-300")
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
                      className="aspect-[3/4] w-full rounded-lg border border-white/10 object-cover"
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
