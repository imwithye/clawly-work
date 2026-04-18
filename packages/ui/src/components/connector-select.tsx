"use client";

import { Icon } from "@iconify/react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { getTypeConfig } from "@/lib/connector-types";
import type { Connector } from "@/lib/types";

export function ConnectorSelect({
  connectors,
  value,
  onChange,
  label,
}: {
  connectors: Connector[];
  value: string | null;
  onChange: (id: string) => void;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = connectors.find((c) => c.id === value);
  const selectedConfig = selected ? getTypeConfig(selected.type) : null;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      {label && (
        <p className="text-xs text-muted uppercase tracking-wider mb-1.5">
          {label}
        </p>
      )}

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-3 py-2.5 border border-border bg-background text-left cursor-pointer transition-colors hover:border-accent/30 focus:outline-none focus:border-accent"
      >
        {selected ? (
          <>
            {selectedConfig && (
              <Image
                src={selectedConfig.icon}
                alt={selectedConfig.label}
                width={24}
                height={24}
                className="shrink-0"
              />
            )}
            <div className="flex-1 min-w-0">
              <span className="text-sm text-foreground">{selected.name}</span>
              {selected.credentials.accountId && (
                <span className="text-xs text-muted ml-2">
                  {selected.credentials.accountId}
                </span>
              )}
            </div>
          </>
        ) : (
          <span className="text-sm text-muted/50 flex-1">
            Select a connector...
          </span>
        )}
        <Icon
          icon="solar:alt-arrow-down-linear"
          width={14}
          className={`text-muted shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute z-20 mt-1 w-full border border-border bg-background shadow-lg max-h-60 overflow-auto">
          {connectors.map((c) => {
            const config = getTypeConfig(c.type);
            const active = c.id === value;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  onChange(c.id);
                  setOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-left cursor-pointer transition-colors ${
                  active
                    ? "bg-accent/10 text-accent"
                    : "hover:bg-default/60 text-foreground"
                }`}
              >
                {config && (
                  <Image
                    src={config.icon}
                    alt={config.label}
                    width={24}
                    height={24}
                    className="shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{c.name}</p>
                  <p className="text-xs text-muted">
                    {config?.label}
                    {c.credentials.accountId && ` · ${c.credentials.accountId}`}
                  </p>
                </div>
                {active && (
                  <Icon
                    icon="solar:check-circle-linear"
                    width={14}
                    className="text-accent shrink-0"
                  />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
