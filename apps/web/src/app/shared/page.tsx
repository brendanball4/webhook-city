"use client";

import { useEffect, useState } from "react";
import { Users2 } from "lucide-react";
import { api, type Project } from "@/lib/api";
import { partitionProjects } from "@/lib/projects";
import { ProjectCard } from "@/components/ProjectCard";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

export default function SharedProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    api
      .listProjects()
      .then((data) => {
        if (active) setProjects(partitionProjects(data).shared);
      })
      .catch((reason) => {
        if (active) setError((reason as Error).message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="mx-auto w-full max-w-7xl space-y-8 px-5 py-8 sm:px-6 lg:py-12">
      <div className="max-w-2xl space-y-3">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
          Collaboration
        </div>
        <h1 className="font-heading text-4xl font-semibold tracking-tight sm:text-5xl">
          Shared projects
        </h1>
        <p className="text-base leading-relaxed text-muted-foreground">
          Projects other people have given you access to. Your role decides what
          you can change.
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <Users2 className="size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Nothing shared with you yet. When someone adds you to a project it
            will appear here.
          </p>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {projects.map((project) => (
            <li key={project.id}>
              <ProjectCard project={project} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
