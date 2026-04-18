"use client";

import { Icon } from "@iconify/react";
import { MatrixRain } from "./matrix-rain";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen">
      {/* Left panel - Matrix background */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-black overflow-hidden">
        <MatrixRain />
        <div className="absolute bottom-8 left-8 z-10 text-sm">
          <p className="text-green-400">$ clawly --status</p>
          <p className="text-green-200/70 mt-1">agents: ready</p>
          <p className="text-green-200/70">tasks: automated</p>
          <p className="text-green-200/70">access: authenticated_only</p>
        </div>
      </div>

      {/* Right panel - Login form */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 lg:w-1/2">
        <div
          className="w-full max-w-sm"
          style={{ animation: "fadeUp 0.5s cubic-bezier(0.16,1,0.3,1) both" }}
        >
          {/* Card */}
          <div className="border border-border">
            {/* Header */}
            <div className="px-5 py-4 border-b border-border flex items-center gap-3">
              <div className="w-8 h-8 bg-accent/10 flex items-center justify-center">
                <Icon
                  icon="solar:bolt-circle-linear"
                  className="text-accent"
                  width={18}
                />
              </div>
              <div>
                <p className="text-sm">
                  <span className="text-foreground font-medium">Clawly</span>
                  <span className="text-muted"> | Cross-entropy AI</span>
                </p>
                <p className="text-[10px] text-muted uppercase tracking-wider">
                  Agent Platform
                </p>
              </div>
            </div>

            {/* Body */}
            <div className="px-5 py-5">
              <p className="text-sm text-muted mb-4">authenticate via</p>
              <button
                type="button"
                className="w-full flex items-center justify-center gap-2 bg-foreground text-background py-2.5 text-sm hover:opacity-90 transition-opacity cursor-pointer"
              >
                <Icon icon="mdi:github" width={18} />
                [continue with github]
              </button>
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-border">
              <p className="text-xs text-muted text-center">
                ——— end-to-end encrypted ———
              </p>
            </div>
          </div>

          {/* Bottom info */}
          <div className="flex items-center justify-between mt-4 px-1">
            <p className="text-xs text-muted">powered by cross-entropy.ai</p>
            <p className="text-xs text-muted">v1.0</p>
          </div>
        </div>
      </div>
    </div>
  );
}
