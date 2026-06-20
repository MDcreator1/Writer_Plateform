"use client";

import { useEffect, useMemo, useState } from "react";

type ProtectedReaderProps = {
  user: {
    id: string;
    username: string;
    emailHash: string;
    sessionId: string;
  };
  children: React.ReactNode;
};

export function ProtectedReader({ user, children }: ProtectedReaderProps) {
  const [warning, setWarning] = useState("");
  const [blurred, setBlurred] = useState(false);
  const watermark = useMemo(() => {
    const timestamp = new Date().toISOString();
    return `${user.username} - ${user.id}\n${user.emailHash.slice(0, 12)} - ${user.sessionId.slice(0, 8)}\n${timestamp}`;
  }, [user.emailHash, user.id, user.sessionId, user.username]);

  useEffect(() => {
    const showWarning = (message: string) => {
      setWarning(message);
      setBlurred(true);
      window.setTimeout(() => setBlurred(false), 1600);
      window.setTimeout(() => setWarning(""), 2600);
    };

    const block = (event: Event) => {
      event.preventDefault();
      showWarning("Protected reader: copying and extraction are disabled.");
    };

    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const blockedShortcut =
        event.key === "PrintScreen" ||
        (event.ctrlKey && ["c", "x", "s", "p", "u"].includes(key)) ||
        (event.metaKey && ["c", "x", "s", "p"].includes(key)) ||
        event.key === "F12";

      if (blockedShortcut) {
        event.preventDefault();
        showWarning("Screenshot and developer shortcuts are monitored on this protected page.");
      }
    };

    document.addEventListener("contextmenu", block);
    document.addEventListener("copy", block);
    document.addEventListener("cut", block);
    document.addEventListener("dragstart", block);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("contextmenu", block);
      document.removeEventListener("copy", block);
      document.removeEventListener("cut", block);
      document.removeEventListener("dragstart", block);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return (
    <div className="relative">
      {warning ? (
        <div className="fixed left-1/2 top-20 z-50 w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 rounded-xl border border-accent2/30 bg-accent3 px-5 py-4 text-sm font-semibold text-surface shadow-luxury">
          {warning}
        </div>
      ) : null}
      <div
        className={`reader-protected relative overflow-hidden rounded-lg transition duration-300 ${
          blurred ? "blur-sm" : ""
        }`}
      >
        <div className="reader-watermark" data-watermark={watermark} />
        {children}
      </div>
    </div>
  );
}
