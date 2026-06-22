"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, type ProjectDetail, type Group } from "@/lib/api";
import { Header } from "@/components/Header";
import { EndpointsPanel } from "@/components/EndpointsPanel";
import { LiveFeed } from "@/components/LiveFeed";
import { CapabilityBadge } from "@/components/CapabilityBadge";
import { LogStoragePanel } from "@/components/LogStoragePanel";
import { ConfirmModal } from "@/components/ConfirmModal";

export default function ProjectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const router = useRouter();
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  async function deleteProject() {
    await api.deleteProject(slug);
    router.push("/");
  }

  async function changeGroup(groupId: string) {
    await api.setProjectGroup(slug, groupId || null);
    reload();
  }

  const reload = useCallback(() => {
    return api
      .getProject(slug)
      .then(setProject)
      .catch((e) => setError((e as Error).message));
  }, [slug]);

  useEffect(() => {
    reload();
    api.listGroups().then(setGroups).catch(() => {});
  }, [reload]);

  return (
    <>
      <Header />
      <main className="mx-auto max-w-5xl px-6 py-8 w-full">
        <Link href="/" className="text-muted text-sm hover:text-foreground">
          ← All projects
        </Link>

        {error && (
          <p className="mt-4 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-rose-300 text-sm">
            {error}
          </p>
        )}

        {!project ? (
          <p className="text-muted mt-6">Loading…</p>
        ) : (
          <>
            <div className="flex items-center gap-3 mt-2 mb-6">
              <h1 className="text-2xl font-semibold">{project.name}</h1>
              <CapabilityBadge capability={project.capability} />
              <select
                value={project.groupId ?? ""}
                onChange={(e) => changeGroup(e.target.value)}
                title="Group"
                className="rounded-md border border-border bg-surface px-2 py-1 text-sm"
              >
                <option value="">No group</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
              <button
                onClick={() => setConfirmingDelete(true)}
                className="ml-auto rounded-lg border border-rose-500/40 px-3 py-1.5 text-sm text-rose-300 hover:bg-rose-500/10"
              >
                Delete project
              </button>
            </div>
            <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
              <div className="grid gap-6 content-start">
                <EndpointsPanel
                  projectSlug={project.slug}
                  initial={project.endpoints}
                  capability={project.capability}
                  onChange={reload}
                />
                {project.capability !== "Webhooks" && (
                  <LogStoragePanel projectSlug={project.slug} />
                )}
              </div>
              <LiveFeed
                projectSlug={project.slug}
                capability={project.capability}
              />
            </div>

            {confirmingDelete && (
              <ConfirmModal
                title={`Delete “${project.name}”?`}
                message={
                  <>
                    This permanently deletes the project, its{" "}
                    {project.endpoints.length} endpoint
                    {project.endpoints.length === 1 ? "" : "s"}, and all stored
                    events. This cannot be undone.
                  </>
                }
                confirmLabel="Delete project"
                onConfirm={deleteProject}
                onCancel={() => setConfirmingDelete(false)}
              />
            )}
          </>
        )}
      </main>
    </>
  );
}
