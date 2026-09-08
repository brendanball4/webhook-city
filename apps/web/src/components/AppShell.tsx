"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Folder, Gauge, RadioTower, Settings, UserRound, LogOut, MoreVertical, Users2 } from "lucide-react";
import { api, type Group, type Project } from "@/lib/api";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { partitionProjects } from "@/lib/projects";
import { useAuth } from "./AuthProvider";
import { ConfirmModal } from "./ConfirmModal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function ProjectLink({ project, pathname }: { project: Project; pathname: string }) {
  const href = `/projects/${project.slug}`;
  return (
    <SidebarMenuSubItem>
      <SidebarMenuSubButton
        render={<Link href={href} />}
        isActive={pathname === href}
        className="h-auto min-h-7 py-1 [&>span:last-child]:overflow-visible [&>span:last-child]:whitespace-normal"
      >
        <RadioTower />
        <span>{project.name}</span>
      </SidebarMenuSubButton>
    </SidebarMenuSubItem>
  );
}

function GroupTree({
  group,
  groups,
  projects,
  pathname,
}: {
  group: Group;
  groups: Group[];
  projects: Project[];
  pathname: string;
}) {
  const [open, setOpen] = useState(true);
  const children = groups.filter((candidate) => candidate.parentId === group.id);
  const directProjects = projects.filter((project) => project.groupId === group.id);

  return (
    <SidebarMenuSubItem>
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger className="flex h-7 w-full items-center gap-1.5 px-2 text-left text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/70 outline-none hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-sidebar-ring">
          <ChevronRight className={`size-3 shrink-0 transition-transform ${open ? "rotate-90" : ""}`} />
          <Folder className="size-3.5 shrink-0" />
          <span className="truncate">{group.name}</span>
        </CollapsibleTrigger>
        <CollapsibleContent>
          {(directProjects.length > 0 || children.length > 0) && (
            <SidebarMenuSub className="mx-1.5 px-1.5">
              {directProjects.map((project) => (
                <ProjectLink key={project.id} project={project} pathname={pathname} />
              ))}
              {children.map((child) => (
                <GroupTree
                  key={child.id}
                  group={child}
                  groups={groups}
                  projects={projects}
                  pathname={pathname}
                />
              ))}
            </SidebarMenuSub>
          )}
        </CollapsibleContent>
      </Collapsible>
    </SidebarMenuSubItem>
  );
}

function SharedTree({
  projects,
  pathname,
}: {
  projects: Project[];
  pathname: string;
}) {
  const [open, setOpen] = useState(true);

  return (
    <SidebarMenuSubItem>
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger className="flex h-7 w-full items-center gap-1.5 px-2 text-left text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/70 outline-none hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-sidebar-ring">
          <ChevronRight className={`size-3 shrink-0 transition-transform ${open ? "rotate-90" : ""}`} />
          <Users2 className="size-3.5 shrink-0" />
          <span className="truncate">Shared projects</span>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub className="mx-1.5 px-1.5">
            {projects.map((project) => (
              <ProjectLink key={project.id} project={project} pathname={pathname} />
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </Collapsible>
    </SidebarMenuSubItem>
  );
}

function initials(name: string) {
  const parts = name.trim().split(/[\s@.]+/).filter(Boolean);
  const letters = parts.length > 1 ? parts[0][0] + parts[1][0] : name.slice(0, 2);
  return letters.toUpperCase();
}

function UserAvatar({ name }: { name: string }) {
  return (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
      {initials(name)}
    </span>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [confirmingSignOut, setConfirmingSignOut] = useState(false);
  const accountName = user?.displayName ?? user?.email ?? "Account";
  const [groups, setGroups] = useState<Group[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  // Shared projects belong to someone else's group tree, so they are listed
  // separately rather than silently vanishing from the grouped view.
  const { owned, shared } = partitionProjects(projects);

  useEffect(() => {
    let active = true;
    const refresh = () => {
      Promise.all([api.listGroups(), api.listProjects()])
        .then(([groupData, projectData]) => {
          if (!active) return;
          setGroups(groupData);
          setProjects(projectData);
        })
        .catch(() => undefined);
    };
    refresh();
    const interval = window.setInterval(refresh, 10_000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [pathname]);

  return (
    <TooltipProvider>
      <SidebarProvider open>
        <Sidebar collapsible="offcanvas">
          <SidebarHeader className="relative border-b p-3">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  size="lg"
                  tooltip="Webhook City"
                  render={<Link href="/dashboard" />}
                >
                  <Image
                    src="/logo.png"
                    alt=""
                    width={40}
                    height={40}
                    priority
                    className="size-10 shrink-0 object-contain"
                  />
                  <span className="font-heading text-base font-semibold uppercase tracking-wider">
                    Webhook City
                  </span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarHeader>

          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Navigation</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      tooltip="Dashboard"
                      isActive={pathname === "/dashboard"}
                      render={<Link href="/dashboard" />}
                    >
                      <Gauge />
                      <span>Dashboard</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      tooltip="Projects"
                      isActive={pathname === "/"}
                      render={<Link href="/" />}
                    >
                      <Folder />
                      <span>Projects</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      tooltip="Shared projects"
                      isActive={pathname === "/shared"}
                      render={<Link href="/shared" />}
                    >
                      <Users2 />
                      <span>Shared projects</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupLabel>Projects</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuSub className="mx-1.5 px-1.5">
                      {groups.filter((group) => !group.parentId).map((group) => (
                        <GroupTree
                          key={group.id}
                          group={group}
                          groups={groups}
                          projects={owned}
                          pathname={pathname}
                        />
                      ))}
                      {owned.filter((project) => !project.groupId).map((project) => (
                        <ProjectLink key={project.id} project={project} pathname={pathname} />
                      ))}
                      {shared.length > 0 && (
                        <SharedTree projects={shared} pathname={pathname} />
                      )}
                    </SidebarMenuSub>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          {/* Full-width rows, profile last — matching the invoice app's footer. */}
          <SidebarFooter className="gap-0 border-t p-0">
            <Link
              href="/settings"
              className="flex w-full items-center gap-2 border-b px-4 py-3 text-sm transition-colors hover:bg-muted/50"
            >
              <Settings className="size-4 shrink-0 text-muted-foreground" />
              <span>Settings</span>
            </Link>

            <button
              type="button"
              onClick={() => setConfirmingSignOut(true)}
              className="flex w-full items-center gap-2 border-b px-4 py-3 text-sm transition-colors hover:bg-muted/50"
            >
              <LogOut className="size-4 shrink-0 text-muted-foreground" />
              <span>Sign out</span>
            </button>

            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50"
                  />
                }
              >
                <UserAvatar name={accountName} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {accountName}
                  </span>
                  {user?.displayName && (
                    <span className="block truncate text-xs text-muted-foreground">
                      {user.email}
                    </span>
                  )}
                </span>
                <MoreVertical className="size-4 shrink-0 text-muted-foreground" />
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="end" className="w-52">
                <DropdownMenuItem render={<Link href="/settings" />}>
                  <UserRound />
                  Account
                </DropdownMenuItem>
                <DropdownMenuItem render={<Link href="/settings" />}>
                  <Settings />
                  Settings
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>

        <SidebarInset className="relative min-w-0 bg-transparent">
          <SidebarTrigger className="fixed left-3 top-3 z-40 border bg-background md:hidden" />
          {children}
        </SidebarInset>

        {confirmingSignOut && (
          <ConfirmModal
            title="Sign out?"
            message="You'll need to sign back in to access your projects."
            confirmLabel="Sign out"
            onConfirm={logout}
            onCancel={() => setConfirmingSignOut(false)}
          />
        )}
      </SidebarProvider>
    </TooltipProvider>
  );
}
