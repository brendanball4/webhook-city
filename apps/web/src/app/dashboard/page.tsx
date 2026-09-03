"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FolderTree, RadioTower, Webhook } from "lucide-react";
import { api, type Group, type Project } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { buttonVariants } from "@/components/ui/button";

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([api.listProjects(), api.listGroups()])
      .then(([projectData, groupData]) => {
        if (!active) return;
        setProjects(projectData);
        setGroups(groupData);
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const endpointCount = projects.reduce((total, project) => total + project.endpointCount, 0);

  return (
    <main className="mx-auto w-full max-w-7xl space-y-10 px-5 py-8 sm:px-6 lg:py-12">
      <div className="space-y-3">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Overview</div>
        <h1 className="font-heading text-4xl font-semibold tracking-tight sm:text-5xl">Dashboard</h1>
        <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">
          A quick view of the projects and receivers connected to this workspace.
        </p>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        {loading ? (
          <><Skeleton className="h-36" /><Skeleton className="h-36" /><Skeleton className="h-36" /></>
        ) : (
          <>
            <Card><CardHeader><FolderTree className="size-4 text-primary" /><CardTitle>Projects</CardTitle></CardHeader><CardContent className="font-heading text-4xl">{projects.length}</CardContent></Card>
            <Card><CardHeader><Webhook className="size-4 text-primary" /><CardTitle>Endpoints</CardTitle></CardHeader><CardContent className="font-heading text-4xl">{endpointCount}</CardContent></Card>
            <Card><CardHeader><RadioTower className="size-4 text-primary" /><CardTitle>Groups</CardTitle></CardHeader><CardContent className="font-heading text-4xl">{groups.length}</CardContent></Card>
          </>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <h2 className="font-heading text-xl font-semibold uppercase tracking-wider">Projects</h2>
          <Link href="/" className={buttonVariants({ variant: "outline", size: "sm" })}>Manage projects</Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Link key={project.id} href={`/projects/${project.slug}`} className="border bg-card p-5 transition-colors hover:border-primary">
              <div className="font-heading text-lg font-semibold">{project.name}</div>
              <div className="mt-2 text-xs uppercase tracking-wider text-muted-foreground">{project.endpointCount} endpoint{project.endpointCount === 1 ? "" : "s"} · {project.capability}</div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
