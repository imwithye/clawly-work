"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { ReactNode } from "react";

function Overlay({ onClick }: { onClick: () => void }) {
  return (
    <motion.div
      className="fixed inset-0 z-40 bg-black/80"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.1 }}
      onClick={onClick}
    />
  );
}

function Content({ children }: { children: ReactNode }) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 4 }}
      transition={{ duration: 0.1 }}
    >
      <div className="bg-surface border border-border w-full max-w-lg">
        {children}
      </div>
    </motion.div>
  );
}

function Header({ children }: { children: ReactNode }) {
  return (
    <div className="px-5 py-3 border-b border-border">
      <h2 className="text-sm text-accent">{children}</h2>
    </div>
  );
}

function Body({ children }: { children: ReactNode }) {
  return <div className="px-5 py-4">{children}</div>;
}

function Footer({ children }: { children: ReactNode }) {
  return (
    <div className="px-5 py-3 border-t border-border flex justify-end gap-2">
      {children}
    </div>
  );
}

export function Modal({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <Overlay onClick={onClose} />
          <Content>{children}</Content>
        </>
      )}
    </AnimatePresence>
  );
}

Modal.Header = Header;
Modal.Body = Body;
Modal.Footer = Footer;
