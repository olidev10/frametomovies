"use client";

import { FormEvent, useMemo, useState } from "react";

type GenerationResult = {
  movieUrl: string;
  prompts: string[];
};

export default function Home() {
  const [scenario, setScenario] = useState("");
  const [scenes, setScenes] = useState(3);
  const [aspectRatio, setAspectRatio] = useState<"16:9" | "9:16">("16:9");
  const [image, setImage] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GenerationResult | null>(null);

  const remainingChars = useMemo(() => 1000 - scenario.length, [scenario.length]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!image) {
      setError("Please upload a frame-0 image.");
      return;
    }

    setIsLoading(true);

    try {
      const form = new FormData();
      form.append("scenario", scenario.slice(0, 1000));
      form.append("scenes", String(scenes));
      form.append("aspectRatio", aspectRatio);
      form.append("image", image);

      const response = await fetch("/api/generate", {
        method: "POST",
        body: form,
      });

      const payload = (await response.json()) as GenerationResult & { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || "Generation failed");
      }

      setResult(payload);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDelete() {
    if (!result) return;

    await fetch("/api/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ movieUrl: result.movieUrl }),
    });

    setResult(null);
  }

  return (
    <main className="min-h-screen bg-[#09090b] text-zinc-100">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-10">
        <h1 className="text-3xl font-bold">Frame-to-Movie Dashboard</h1>
        <p className="text-sm text-zinc-400">
          Create connected multi-scene videos from one starting frame and one scenario.
        </p>

        <form onSubmit={handleSubmit} className="rounded-xl border border-zinc-800 bg-zinc-950 p-5">
          <div className="grid gap-4">
            <label className="grid gap-2">
              <span className="text-sm text-zinc-300">Scenario (max 1000 chars)</span>
              <textarea
                value={scenario}
                onChange={(event) => setScenario(event.target.value.slice(0, 1000))}
                maxLength={1000}
                required
                className="min-h-40 rounded-md border border-zinc-700 bg-zinc-900 p-3 outline-none ring-violet-400 focus:ring"
              />
              <span className="text-xs text-zinc-500">{remainingChars} characters left</span>
            </label>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <label className="grid gap-2">
                <span className="text-sm text-zinc-300">Scenes (X)</span>
                <input
                  type="number"
                  min={1}
                  max={8}
                  value={scenes}
                  onChange={(event) => setScenes(Number(event.target.value))}
                  className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 outline-none ring-violet-400 focus:ring"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-sm text-zinc-300">Aspect ratio</span>
                <select
                  value={aspectRatio}
                  onChange={(event) => setAspectRatio(event.target.value as "16:9" | "9:16")}
                  className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 outline-none ring-violet-400 focus:ring"
                >
                  <option value="16:9">16:9</option>
                  <option value="9:16">9:16</option>
                </select>
              </label>

              <label className="grid gap-2">
                <span className="text-sm text-zinc-300">Frame 0 image</span>
                <input
                  type="file"
                  accept="image/*"
                  required
                  onChange={(event) => setImage(event.target.files?.[0] || null)}
                  className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 file:mr-3 file:rounded file:border-0 file:bg-violet-600 file:px-3 file:py-1 file:text-white"
                />
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="mt-2 rounded-md bg-violet-600 px-4 py-2 font-semibold text-white disabled:opacity-50"
            >
              {isLoading ? "Generating movie..." : "Generate movie"}
            </button>

            {error ? <p className="text-sm text-red-400">{error}</p> : null}
          </div>
        </form>

        {result ? (
          <section className="grid gap-4 rounded-xl border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-xl font-semibold">Final movie</h2>
            <video controls className="w-full rounded-md border border-zinc-800" src={result.movieUrl} />
            <div className="flex gap-3">
              <a
                href={result.movieUrl}
                download
                className="rounded-md bg-zinc-700 px-4 py-2 text-sm font-medium hover:bg-zinc-600"
              >
                Download
              </a>
              <button
                type="button"
                onClick={handleDelete}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium hover:bg-red-500"
              >
                Delete
              </button>
            </div>
            <details className="rounded-md border border-zinc-800 p-3">
              <summary className="cursor-pointer text-sm text-zinc-300">Generated scene prompts</summary>
              <ol className="mt-2 list-decimal space-y-2 pl-6 text-sm text-zinc-400">
                {result.prompts.map((prompt, index) => (
                  <li key={prompt + index}>{prompt}</li>
                ))}
              </ol>
            </details>
          </section>
        ) : null}
      </div>
    </main>
  );
}
