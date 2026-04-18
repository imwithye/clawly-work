"use client";

import { Icon } from "@iconify/react";
import { useTheme } from "next-themes";

export function Header() {
  const { theme, setTheme } = useTheme();

  return (
    <header className="h-10 border-b border-border flex items-center justify-between px-4">
      <button
        type="button"
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        className="text-muted hover:text-foreground transition-colors cursor-pointer"
      >
        <Icon
          icon={theme === "dark" ? "solar:sun-linear" : "solar:moon-linear"}
          width={14}
        />
      </button>

      <div className="flex items-center gap-3">
        <span className="text-xs text-muted">user@clawly-work.dev</span>
        <button
          type="button"
          className="text-xs text-danger hover:text-danger/80 transition-colors cursor-pointer"
        >
          [logout]
        </button>
      </div>
    </header>
  );
}
