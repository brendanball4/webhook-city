"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Plus, Users2 } from "lucide-react";
import {
  api,
  type Project,
  type Group,
  type ProjectCapability,
} from "@/lib/api";
import { CAPABILITY_META } from "@/components/CapabilityBadge";
import { GroupSection } from "@/components/GroupSection";
import { ProjectCard } from "@/components/ProjectCard";
import { partitionProjects } from "@/lib/projects";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

const CAPABILITY_OPTIONS: ProjectCapability[] = ["Webhooks", "Logs", "Both"];
const UNGROUPED = "ungrouped";

function groupPath(group: Group, groups: Group[]): string {
  const parent = groups.find((candidate) => candidate.id === group.parentId);
  return parent ? `${groupPath(parent, groups)} / ${group.name}` : group.name;
}

export default function HomePage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [name, setName] = useState("");
  const [capability, setCapability] = useState<ProjectCapability>("Both");
  const [groupId, setGroupId] = useState(UNGROUPED);
  const [newGroupName, setNewGroupName] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const [projectData, groupData] = await Promise.all([
        api.listProjects(),
        api.listGroups(),
      ]);
      setProjects(projectData);
      setGroups(groupData);
      setError(null);
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;

    Promise.all([api.listProjects(), api.listGroups()])
      .then(([projectData, groupData]) => {
        if (!active) return;
        setProjects(projectData);
        setGroups(groupData);
        setError(null);
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

  async function create(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    try {
      await api.createProject(
        name.trim(),
        capability,
        groupId === UNGROUPED ? null : groupId,
      );
      setName("");
      setCapability("Both");
      await load();
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setCreating(false);
    }
  }

  async function addGroup() {
    if (!newGroupName.trim()) return;
    try {
      const group = await api.createGroup(newGroupName.trim());
      setNewGroupName("");
      setGroupId(group.id);
      await load();
    } catch (reason) {
      setError((reason as Error).message);
    }
  }

  // Only own projects belong in the group tree — shared ones live under
  // someone else's groups and would otherwise disappear entirely.
  const { owned, shared } = partitionProjects(projects);
  const ungrouped = owned.filter((project) => !project.groupId);

  return (
      <main className="mx-auto w-full max-w-7xl space-y-10 px-5 py-8 sm:px-6 lg:py-12">
        <div className="max-w-2xl space-y-3">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            Operations
          </div>
          <h1 className="font-heading text-4xl font-semibold tracking-tight sm:text-5xl">
            Projects
          </h1>
          <p className="text-base leading-relaxed text-muted-foreground">
            Receive, inspect, and route events from every service in one place.
          </p>
        </div>

        <Card>
          <CardHeader className="border-b">
            <CardTitle>New project</CardTitle>
            <CardDescription>
              Create an isolated workspace with its own endpoints and event history.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={create} className="grid gap-8 lg:grid-cols-[1fr_1.4fr]">
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="project-name">Project name</Label>
                  <Input
                    id="project-name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Acme Deploys"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Group</Label>
                  <Select value={groupId} onValueChange={(value) => value && setGroupId(value)}>
                    <SelectTrigger className="w-full">
                      <SelectValue>
                        {groupId === UNGROUPED
                          ? "No group"
                          : (() => {
                              const selected = groups.find((group) => group.id === groupId);
                              return selected ? groupPath(selected, groups) : "Select group";
                            })()}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={UNGROUPED}>No group</SelectItem>
                      {groups.map((group) => (
                        <SelectItem key={group.id} value={group.id}>
                          {groupPath(group, groups)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <Input
                    value={newGroupName}
                    onChange={(event) => setNewGroupName(event.target.value)}
                    placeholder="New group"
                    aria-label="New group name"
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        void addGroup();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addGroup}
                    disabled={!newGroupName.trim()}
                  >
                    Add
                  </Button>
                </div>
              </div>

              <div className="space-y-5">
                <div className="space-y-2">
                  <Label>Collection type</Label>
                  <p className="text-sm text-muted-foreground">
                    This can expand later without changing the project URL.
                  </p>
                </div>
                <div className="grid gap-2 sm:grid-cols-3">
                  {CAPABILITY_OPTIONS.map((option) => {
                    const meta = CAPABILITY_META[option];
                    const Icon = meta.icon;
                    const selected = capability === option;
                    return (
                      <Button
                        type="button"
                        key={option}
                        variant={selected ? "default" : "outline"}
                        onClick={() => setCapability(option)}
                        className="h-auto min-h-28 items-start justify-start whitespace-normal px-4 py-4 text-left normal-case tracking-normal"
                      >
                        <span className="space-y-2">
                          <span className="flex items-center gap-2 font-heading text-sm font-semibold uppercase tracking-wider">
                            <Icon className="size-4" />
                            {meta.label}
                          </span>
                          <span className={`block text-xs leading-relaxed ${selected ? "text-primary-foreground/75" : "text-muted-foreground"}`}>
                            {meta.blurb}
                          </span>
                        </span>
                      </Button>
                    );
                  })}
                </div>
                <Button type="submit" disabled={creating || !name.trim()}>
                  <Plus data-icon="inline-start" />
                  {creating ? "Creating…" : "Create project"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {error && (
          <Alert variant="destructive">
            <AlertCircle />
            <AlertTitle>Could not load projects</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <section className="space-y-8">
          <h2 className="font-heading text-xl font-semibold uppercase tracking-wider">
            Workspace
          </h2>

          {loading ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
            </div>
          ) : projects.length === 0 && groups.length === 0 ? (
            <p className="border border-dashed px-6 py-12 text-center text-muted-foreground">
              No projects yet. Create the first one above.
            </p>
          ) : (
            <div className="space-y-10">
              {groups.filter((group) => !group.parentId).map((group) => (
                <GroupSection
                  key={group.id}
                  group={group}
                  groups={groups}
                  projects={owned}
                  onChange={load}
                />
              ))}
              {ungrouped.length > 0 && (
                <GroupSection group={null} groups={groups} projects={ungrouped} onChange={load} />
              )}

              {shared.length > 0 && (
                <section className="space-y-4">
                  <div className="flex min-h-9 items-center gap-2">
                    <Users2 className="size-4 text-muted-foreground" />
                    <h2 className="font-heading text-sm font-semibold uppercase tracking-wider">
                      Shared with me
                    </h2>
                  </div>
                  <ul className="grid gap-3 sm:grid-cols-2">
                    {shared.map((project) => (
                      <li key={project.id}>
                        <ProjectCard project={project} />
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          )}
        </section>
      </main>
  );
}
