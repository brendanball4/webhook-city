"use client";

import { useEffect, useState } from "react";
import {
  api,
  type Project,
  type Group,
  type ProjectCapability,
} from "@/lib/api";
import { Header } from "@/components/Header";
import { CAPABILITY_META } from "@/components/CapabilityBadge";
import { GroupSection } from "@/components/GroupSection";

const CAPABILITY_OPTIONS: ProjectCapability[] = ["Webhooks", "Logs", "Both"];

export default function HomePage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [name, setName] = useState("");
  const [capability, setCapability] = useState<ProjectCapability>("Both");
  const [groupId, setGroupId] = useState<string>(""); // "" = no group
  const [newGroupName, setNewGroupName] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const [ps, gs] = await Promise.all([
        api.listProjects(),
        api.listGroups(),
      ]);
      setProjects(ps);
      setGroups(gs);
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
      await api.createProject(name.trim(), capability, groupId || null);
      setName("");
      setCapability("Both");
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setCreating(false);
    }
  }

  async function addGroup() {
    if (!newGroupName.trim()) return;
    try {
      const g = await api.createGroup(newGroupName.trim());
      setNewGroupName("");
      setGroupId(g.id); // select the new group for the next project
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  // Projects bucketed by group, groups ordered as returned (by name).
  const ungrouped = projects.filter((p) => !p.groupId);

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

          <div className="text-sm text-muted mb-2">
            What will it collect?{" "}
            <span className="text-muted/70">
              You can add the other type later, anytime.
            </span>
          </div>
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

          <div className="flex flex-wrap items-center gap-2 mb-4">
            <label className="text-sm text-muted">Group:</label>
            <select
              value={groupId}
              onChange={(e) => setGroupId(e.target.value)}
              className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
            >
              <option value="">No group</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
            <span className="text-muted text-sm">or</span>
            <input
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="New group name…"
              className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addGroup();
                }
              }}
            />
            <button
              type="button"
              onClick={addGroup}
              disabled={!newGroupName.trim()}
              className="text-sm rounded-md border border-border px-3 py-1.5 hover:bg-surface-2 disabled:opacity-50"
            >
              Add group
            </button>
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
        ) : projects.length === 0 && groups.length === 0 ? (
          <p className="text-muted">No projects yet. Create one above.</p>
        ) : (
          <>
            {groups.map((g) => (
              <GroupSection
                key={g.id}
                group={g}
                projects={projects.filter((p) => p.groupId === g.id)}
                onChange={load}
              />
            ))}
            {ungrouped.length > 0 && (
              <GroupSection group={null} projects={ungrouped} onChange={load} />
            )}
          </>
        )}
      </main>
    </>
  );
}
