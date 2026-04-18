"use client";

import { Icon } from "@iconify/react";

export default function ChatIndexPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-muted gap-2">
      <Icon icon="solar:chat-dots-linear" width={32} />
      <p className="text-sm">Select a conversation or start a new one</p>
    </div>
  );
}
