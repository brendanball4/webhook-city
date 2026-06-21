"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, type Project, type ProjectCapability } from "@/lib/api";
import { Header } from "@/components/Header";
import { CapabilityBadge, CAPABILITY_META } from "@/components/CapabilityBadge";

const CAPABILITY_OPTIONS: ProjectCapability[] = ["Webhooks", "Logs", "Both"];

export default function HomePage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [name, setName] = useState("");
  const [capability, setCapability] = useState<ProjectCapability>("Both");
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
      await api.createProject(name.trim(), capability);
      setName("");
      setCapability("Both");
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

        <form
          onSubmit={create}
          className="mb-8 rounded-xl border border-border bg-surface p-5"
        >
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="New project name…"
            className="w-full rounded-lg border border-border bg-background px-4 py-2 outline-none focus:border-accent mb-4"
          />

          <div className="text-sm text-muted mb-2">What will it collect?</div>
          <div className="grid gap-2 sm:grid-cols-3 mb-4">
            {CAPABILITY_OPTIONS.map((cap) => {
              const meta = CAPABILITY_META[cap];
              const selected = capability === cap;
              return (
                <button
                  type="button"
                  key={cap}
                  onClick={() => setCapability(cap)}
                  className={`text-left rounded-lg border p-3 transition-colors ${
                    selected
                      ? "border-accent bg-accent/10"
                      : "border-border bg-background hover:border-muted"
                  }`}
                >
                  <div className="font-medium flex items-center gap-1.5">
                    <span>{meta.icon}</span>
                    {meta.label}
                  </div>
                  <div className="text-xs text-muted mt-1">{meta.blurb}</div>
                </button>
              );
            })}
          </div>

          <button
            type="submit"
            disabled={creating || !name.trim()}
            className="rounded-lg bg-accent px-4 py-2 font-medium text-white disabled:opacity-50"
          >
            {creating ? "Creating…" : "Create project"}
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
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-medium text-lg">{p.name}</div>
                    <CapabilityBadge capability={p.capability} />
                  </div>
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
