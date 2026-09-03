import Link from "next/link";
import { type Project } from "@/lib/api";
import { CapabilityBadge } from "./CapabilityBadge";
import { ArrowUpRight } from "lucide-react";
import {
  Card,
  CardAction,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function ProjectCard({ project }: { project: Project }) {
  return (
    <Link href={`/projects/${project.slug}`} className="group block h-full">
      <Card className="h-full transition-colors group-hover:bg-secondary/60">
        <CardHeader>
          <CardTitle className="normal-case tracking-wide">{project.name}</CardTitle>
          <CardDescription>
            {project.endpointCount} endpoint
            {project.endpointCount === 1 ? "" : "s"}
            {" / "}
            <span className="font-mono">{project.slug}</span>
          </CardDescription>
          <CardAction className="flex items-center gap-3">
            <CapabilityBadge capability={project.capability} />
            <ArrowUpRight className="size-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </CardAction>
        </CardHeader>
      </Card>
    </Link>
  );
}
