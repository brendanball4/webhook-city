"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft, Trash2 } from "lucide-react";
import { api, type ProjectDetail, type Group } from "@/lib/api";
import { EndpointsPanel } from "@/components/EndpointsPanel";
import { LiveFeed } from "@/components/LiveFeed";
import { CapabilityBadge } from "@/components/CapabilityBadge";
import { LogStoragePanel } from "@/components/LogStoragePanel";
import { ConfirmModal } from "@/components/ConfirmModal";
import { StatusBoard } from "@/components/StatusBoard";
import { SlackPanel } from "@/components/SlackPanel";
import { SharePanel } from "@/components/SharePanel";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

const NO_GROUP = "no-group";

function groupPath(group: Group, groups: Group[]): string {
  const parent = groups.find((candidate) => candidate.id === group.parentId);
  return parent ? `${groupPath(parent, groups)} / ${group.name}` : group.name;
}

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

  async function changeGroup(groupId: string | null) {
    await api.setProjectGroup(slug, groupId === NO_GROUP ? null : groupId);
    void reload();
  }

  function reload() {
    return api
      .getProject(slug)
      .then(setProject)
      .catch((reason) => setError((reason as Error).message));
  }

  useEffect(() => {
    let active = true;

    api
      .getProject(slug)
      .then((value) => {
        if (active) setProject(value);
      })
      .catch((reason) => {
        if (active) setError((reason as Error).message);
      });
    api
      .listGroups()
      .then((value) => {
        if (active) setGroups(value);
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, [slug]);

  return (
      <main className="mx-auto w-full max-w-7xl space-y-8 px-5 py-6 sm:px-6 lg:py-8">
        <Link href="/" className={buttonVariants({ variant: "ghost", size: "sm" })}>
          <ArrowLeft data-icon="inline-start" />
          All projects
        </Link>

        {error && (
          <Alert variant="destructive">
            <AlertCircle />
            <AlertTitle>Could not load project</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!project ? (
          <div className="space-y-5">
            <Skeleton className="h-12 w-72" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : (
          <>
            <section className="flex flex-col gap-5 border-b pb-7 lg:flex-row lg:items-end">
              <div className="min-w-0 flex-1 space-y-3">
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                  Project
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="font-heading text-4xl font-semibold tracking-tight sm:text-5xl">
                    {project.name}
                  </h1>
                  <CapabilityBadge capability={project.capability} />
                </div>
                <p className="font-mono text-xs text-muted-foreground">
                  /{project.slug}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Select
                  value={project.groupId ?? NO_GROUP}
                  onValueChange={(value) => value && void changeGroup(value)}
                >
                  <SelectTrigger aria-label="Project group">
                    <SelectValue>
                      {project.groupId
                        ? (() => {
                            const selected = groups.find((group) => group.id === project.groupId);
                            return selected ? groupPath(selected, groups) : "Loading group";
                          })()
                        : "No group"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_GROUP}>No group</SelectItem>
                    {groups.map((group) => (
                      <SelectItem key={group.id} value={group.id}>
                        {groupPath(group, groups)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {project.role === "Owner" && (
                  <Button
                    variant="destructive"
                    onClick={() => setConfirmingDelete(true)}
                  >
                    <Trash2 data-icon="inline-start" />
                    Delete project
                  </Button>
                )}
              </div>
            </section>

            <StatusBoard projectSlug={project.slug} />

            <div className="grid items-start gap-6 xl:grid-cols-[minmax(22rem,0.8fr)_minmax(0,1.7fr)]">
              <div className="grid content-start gap-6">
                <EndpointsPanel
                  projectSlug={project.slug}
                  initial={project.endpoints}
                  capability={project.capability}
                  onChange={reload}
                />
                {project.role === "Owner" && (
                  <SlackPanel projectSlug={project.slug} />
                )}
                <SharePanel projectSlug={project.slug} role={project.role} />
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
                    This permanently deletes the project, its {project.endpoints.length} endpoint
                    {project.endpoints.length === 1 ? "" : "s"}, and all stored events.
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
  );
}
