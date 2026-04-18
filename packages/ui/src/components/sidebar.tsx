"use client";

import { Icon } from "@iconify/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const nav = [
  {
    section: "OVERVIEW",
    items: [
      {
        label: "Dashboard",
        href: "/dashboard",
        icon: "solar:widget-2-linear",
      },
    ],
  },
  {
    section: "MANAGEMENT",
    items: [
      {
        label: "Agents",
        href: "/dashboard/agents",
        icon: "solar:bot-linear",
      },
      {
        label: "Tasks",
        href: "/dashboard/tasks",
        icon: "solar:checklist-minimalistic-linear",
      },
      {
        label: "API Keys",
        href: "/dashboard/api-keys",
        icon: "solar:key-linear",
      },
    ],
  },
  {
    section: "SETTINGS",
    items: [
      {
        label: "Team",
        href: "/dashboard/team",
        icon: "solar:users-group-rounded-linear",
      },
      {
        label: "Settings",
        href: "/dashboard/settings",
        icon: "solar:settings-linear",
      },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 h-full bg-sidebar border-r border-border flex flex-col">
      {/* Brand */}
      <div className="px-4 py-4">
        <p className="text-sm text-accent font-medium">Clawly</p>
        <p className="text-[10px] text-muted">Cross-entropy AI</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 space-y-4">
        {nav.map((group) => (
          <div key={group.section}>
            <p className="px-2 mb-1 text-xs text-muted uppercase tracking-wider">
              {group.section}
            </p>
            {group.items.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-2 py-1.5 text-sm transition-colors ${
                    active
                      ? "text-accent bg-default/50"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  <Icon icon={item.icon} width={14} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}
