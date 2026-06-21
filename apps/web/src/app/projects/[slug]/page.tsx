"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { api, type ProjectDetail } from "@/lib/api";
import { Header } from "@/components/Header";
import { EndpointsPanel } from "@/components/EndpointsPanel";
import { LiveFeed } from "@/components/LiveFeed";
import { CapabilityBadge } from "@/components/CapabilityBadge";
import { LogStoragePanel } from "@/components/LogStoragePanel";

export default function ProjectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getProject(slug)
      .then(setProject)
      .catch((e) => setError((e as Error).message));
  }, [slug]);

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
            </div>
            <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
              <div className="grid gap-6 content-start">
                <EndpointsPanel
                  projectSlug={project.slug}
                  initial={project.endpoints}
                  capability={project.capability}
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
          </>
        )}
      </main>
    </>
  );
}
