"use client";

import { createContext, useContext } from "react";

export type ChatSession = {
  id: string;
  title: string;
  createdAt: string;
};

type ChatContextValue = {
  activeSession?: ChatSession;
};

const ChatContext = createContext<ChatContextValue>({});

export function ChatProvider({
  activeSession,
  children,
}: ChatContextValue & { children: React.ReactNode }) {
  return (
    <ChatContext.Provider value={{ activeSession }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useActiveChatSession() {
  return useContext(ChatContext).activeSession;
}
