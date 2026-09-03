import { type Project } from "./api";

/**
 * Split projects into the caller's own and those shared with them.
 *
 * This matters for any grouped view: a shared project's `groupId` refers to a
 * group owned by *someone else*, which the caller never receives. Without this
 * split such a project matches no group and is not "ungrouped" either, so it
 * silently disappears from the tree.
 */
export function partitionProjects(projects: Project[]) {
  return {
    owned: projects.filter((project) => project.role === "Owner"),
    shared: projects.filter((project) => project.role !== "Owner"),
  };
}
