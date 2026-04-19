"use client";

import { Icon } from "@iconify/react";

export default function ChatIndexPage() {
  return (
    <div className="flex h-full min-h-0 items-center justify-center bg-background px-6">
      <div className="max-w-sm text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-[3px] border border-border bg-surface text-muted">
          <Icon icon="solar:chat-dots-linear" width={24} />
        </div>
        <p className="text-sm font-medium text-foreground">
          Choose a conversation
        </p>
        <p className="mt-2 text-xs leading-5 text-muted">
          Open an existing thread or start a new one from the conversation list.
        </p>
      </div>
    </div>
  );
}
