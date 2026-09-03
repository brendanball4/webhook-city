"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Folder, Gauge, RadioTower, Settings, UserRound, LogOut } from "lucide-react";
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
import { useAuth } from "./AuthProvider";

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

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);

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
                  <span className="flex size-8 shrink-0 items-center justify-center bg-primary text-primary-foreground">
                    <RadioTower className="size-4" />
                  </span>
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
                          projects={projects}
                          pathname={pathname}
                        />
                      ))}
                      {projects.filter((project) => !project.groupId).map((project) => (
                        <ProjectLink key={project.id} project={project} pathname={pathname} />
                      ))}
                    </SidebarMenuSub>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="border-t p-2">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton tooltip="Settings" isActive={pathname === "/settings"} render={<Link href="/settings" />}>
                  <Settings />
                  <span>Settings</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton tooltip={user?.email ?? "Account"} render={<Link href="/settings" />}>
                  <UserRound />
                  <span className="flex min-w-0 flex-col items-start leading-tight">
                    <span className="truncate">{user?.displayName ?? user?.email ?? "Account"}</span>
                    {user?.displayName && (
                      <span className="truncate text-[10px] text-muted-foreground">
                        {user.email}
                      </span>
                    )}
                  </span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton tooltip="Sign out" onClick={logout}>
                  <LogOut />
                  <span>Sign out</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>

        <SidebarInset className="relative min-w-0">
          <SidebarTrigger className="fixed left-3 top-3 z-40 border bg-background md:hidden" />
          {children}
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
