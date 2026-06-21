"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, type Project } from "@/lib/api";
import { Header } from "@/components/Header";

export default function HomePage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setProjects(await api.listProjects());
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    try {
      await api.createProject(name.trim());
      setName("");
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setCreating(false);
    }
  }

  return (
    <>
      <Header />
      <main className="mx-auto max-w-5xl px-6 py-8 w-full">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold">Projects</h1>
        </div>

        <form onSubmit={create} className="flex gap-2 mb-8">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="New project name…"
            className="flex-1 rounded-lg border border-border bg-surface px-4 py-2 outline-none focus:border-accent"
          />
          <button
            type="submit"
            disabled={creating || !name.trim()}
            className="rounded-lg bg-accent px-4 py-2 font-medium text-white disabled:opacity-50"
          >
            {creating ? "Creating…" : "Create"}
          </button>
        </form>

        {error && (
          <p className="mb-4 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-rose-300 text-sm">
            {error}
          </p>
        )}

        {loading ? (
          <p className="text-muted">Loading…</p>
        ) : projects.length === 0 ? (
          <p className="text-muted">No projects yet. Create one above.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {projects.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/projects/${p.slug}`}
                  className="block rounded-xl border border-border bg-surface p-5 hover:border-accent transition-colors"
                >
                  <div className="font-medium text-lg">{p.name}</div>
                  <div className="text-muted text-sm mt-1">
                    {p.endpointCount} endpoint{p.endpointCount === 1 ? "" : "s"}
                    {" · "}
                    <span className="font-mono">/{p.slug}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
