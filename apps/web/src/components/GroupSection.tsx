"use client";

import { useState } from "react";
import { Folder, FolderPlus, Pencil, Trash2 } from "lucide-react";
import { api, type Group, type Project } from "@/lib/api";
import { ProjectCard } from "./ProjectCard";
import { ConfirmModal } from "./ConfirmModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function GroupSection({
  group,
  groups,
  projects,
  onChange,
  depth = 0,
}: {
  group: Group | null;
  groups: Group[];
  projects: Project[];
  onChange: () => void;
  depth?: number;
}) {
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(group?.name ?? "");
  const [addingChild, setAddingChild] = useState(false);
  const [childName, setChildName] = useState("");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const children = group
    ? groups.filter((candidate) => candidate.parentId === group.id)
    : [];
  const directProjects = group
    ? projects.filter((project) => project.groupId === group.id)
    : projects.filter((project) => !project.groupId);

  async function saveRename() {
    if (group && name.trim() && name.trim() !== group.name) {
      await api.updateGroup(group.id, name.trim(), group.color, group.parentId);
      onChange();
    }
    setRenaming(false);
  }

  async function addChild() {
    if (!group || !childName.trim()) return;
    await api.createGroup(childName.trim(), null, group.id);
    setChildName("");
    setAddingChild(false);
    onChange();
  }

  async function deleteGroup() {
    if (group) {
      await api.deleteGroup(group.id);
      onChange();
    }
  }

  return (
    <section className={depth > 0 ? "space-y-4 border-l pl-5 sm:pl-7" : "space-y-4"}>
      <div className="flex min-h-9 items-center gap-2">
        <Folder className="size-4 text-muted-foreground" />
        {renaming ? (
          <Input
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
            onBlur={saveRename}
            onKeyDown={(event) => event.key === "Enter" && saveRename()}
            className="h-8 max-w-64"
          />
        ) : (
          <h2 className="font-heading text-sm font-semibold uppercase tracking-wider">
            {group ? group.name : "Ungrouped"}
          </h2>
        )}

        {group && !renaming && (
          <div className="ml-auto flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => setAddingChild((value) => !value)}
              aria-label={`Add subgroup to ${group.name}`}
              title="Add subgroup"
            >
              <FolderPlus />
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => {
                setName(group.name);
                setRenaming(true);
              }}
              aria-label={`Rename ${group.name}`}
            >
              <Pencil />
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => setConfirmingDelete(true)}
              aria-label={`Delete ${group.name}`}
            >
              <Trash2 />
            </Button>
          </div>
        )}
      </div>

      {addingChild && group && (
        <div className="flex max-w-md gap-2">
          <Input
            autoFocus
            value={childName}
            onChange={(event) => setChildName(event.target.value)}
            placeholder={`Subgroup inside ${group.name}`}
            onKeyDown={(event) => {
              if (event.key === "Enter") void addChild();
              if (event.key === "Escape") setAddingChild(false);
            }}
          />
          <Button type="button" onClick={addChild} disabled={!childName.trim()}>
            Add
          </Button>
        </div>
      )}

      {directProjects.length > 0 && (
        <ul className="grid gap-3 sm:grid-cols-2">
          {directProjects.map((project) => (
            <li key={project.id}>
              <ProjectCard project={project} />
            </li>
          ))}
        </ul>
      )}

      {children.length > 0 && (
        <div className="space-y-7">
          {children.map((child) => (
            <GroupSection
              key={child.id}
              group={child}
              groups={groups}
              projects={projects}
              onChange={onChange}
              depth={depth + 1}
            />
          ))}
        </div>
      )}

      {confirmingDelete && group && (
        <ConfirmModal
          title={`Delete group “${group.name}”?`}
          message="The group will be removed. Its projects will become ungrouped, and its subgroups will move up one level."
          confirmLabel="Delete group"
          onConfirm={deleteGroup}
          onCancel={() => setConfirmingDelete(false)}
        />
      )}
    </section>
  );
}
