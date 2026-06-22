"use client";

import { useState } from "react";
import { api, type Group, type Project } from "@/lib/api";
import { ProjectCard } from "./ProjectCard";
import { ConfirmModal } from "./ConfirmModal";

export function GroupSection({
  group,
  projects,
  onChange,
}: {
  group: Group | null; // null = the "Ungrouped" bucket
  projects: Project[];
  onChange: () => void;
}) {
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(group?.name ?? "");
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  async function saveRename() {
    if (group && name.trim() && name.trim() !== group.name) {
      await api.updateGroup(group.id, name.trim(), group.color);
      onChange();
    }
    setRenaming(false);
  }

  async function deleteGroup() {
    if (group) {
      await api.deleteGroup(group.id);
      onChange();
    }
  }

  return (
    <section className="mb-8">
      <div className="flex items-center gap-2 mb-3">
        {group?.color && (
          <span
            className="h-3 w-3 rounded-full shrink-0"
            style={{ backgroundColor: group.color }}
          />
        )}
        {renaming ? (
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={saveRename}
            onKeyDown={(e) => e.key === "Enter" && saveRename()}
            className="rounded-md border border-border bg-surface px-2 py-0.5 text-sm"
          />
        ) : (
          <h2 className="font-semibold">
            {group ? group.name : "Ungrouped"}
          </h2>
        )}
        <span className="text-muted text-sm">({projects.length})</span>

        {group && !renaming && (
          <div className="ml-auto flex gap-2 text-xs">
            <button
              onClick={() => {
                setName(group.name);
                setRenaming(true);
              }}
              className="text-muted hover:text-foreground"
            >
              Rename
            </button>
            <button
              onClick={() => setConfirmingDelete(true)}
              className="text-muted hover:text-rose-300"
            >
              Delete
            </button>
          </div>
        )}
      </div>

      {projects.length === 0 ? (
        <p className="text-muted text-sm">No projects here yet.</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {projects.map((p) => (
            <li key={p.id}>
              <ProjectCard project={p} />
            </li>
          ))}
        </ul>
      )}

      {confirmingDelete && group && (
        <ConfirmModal
          title={`Delete group “${group.name}”?`}
          message={
            <>
              The group will be removed. Its {projects.length} project
              {projects.length === 1 ? "" : "s"} will be kept and moved to
              Ungrouped.
            </>
          }
          confirmLabel="Delete group"
          onConfirm={deleteGroup}
          onCancel={() => setConfirmingDelete(false)}
        />
      )}
    </section>
  );
}
