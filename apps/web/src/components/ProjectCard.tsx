import Link from "next/link";
import { type Project } from "@/lib/api";
import { CapabilityBadge } from "./CapabilityBadge";

export function ProjectCard({ project }: { project: Project }) {
  return (
    <Link
      href={`/projects/${project.slug}`}
      className="block rounded-xl border border-border bg-surface p-5 hover:border-accent transition-colors"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="font-medium text-lg">{project.name}</div>
        <CapabilityBadge capability={project.capability} />
      </div>
      <div className="text-muted text-sm mt-1">
        {project.endpointCount} endpoint
        {project.endpointCount === 1 ? "" : "s"}
        {" · "}
        <span className="font-mono">/{project.slug}</span>
      </div>
    </Link>
  );
}
