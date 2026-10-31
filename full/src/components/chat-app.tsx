"use client";

import { generateId, type UIMessage } from "ai";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  deleteThread,
  listThreads,
  loadThreadMessages,
  type ThreadSummary,
} from "@/lib/api";
import { ChatPanel } from "./chat-panel";
import { Sidebar } from "./sidebar";

type Props = {
  chatUrl: string;
  threadsUrl: string;
  uploadUrl: string;
  /** From `/c/[threadId]` — reload restores this thread. */
  threadId: string;
};

export function ChatApp({ chatUrl, threadsUrl, uploadUrl, threadId }: Props) {
  const router = useRouter();
  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [initialMessages, setInitialMessages] = useState<UIMessage[]>([]);
  const [loadingThread, setLoadingThread] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [error, setError] = useState("");

  const refreshThreads = useCallback(async () => {
    try {
      setThreads(await listThreads(threadsUrl));
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load threads");
    }
  }, [threadsUrl]);

  useEffect(() => {
    void refreshThreads();
  }, [refreshThreads]);

  useEffect(() => {
    let cancelled = false;
    setLoadingThread(true);
    setInitialMessages([]);
    setError("");

    void (async () => {
      try {
        const messages = await loadThreadMessages(threadsUrl, threadId);
        if (cancelled) return;
        setInitialMessages(messages);
      } catch {
        // New thread id that is not on the server yet — start empty.
        if (!cancelled) setInitialMessages([]);
      } finally {
        if (!cancelled) setLoadingThread(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [threadId, threadsUrl]);

  function startNewThread() {
    router.push(`/c/${generateId()}`);
  }

  function openThread(id: string) {
    if (id === threadId) return;
    router.push(`/c/${id}`);
  }

  async function removeThread(id: string) {
    if (!window.confirm("Delete this chat?")) return;
    try {
      await deleteThread(threadsUrl, id);
      setThreads((prev) => prev.filter((thread) => thread.id !== id));
      if (id === threadId) startNewThread();
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete thread");
    }
  }

  return (
    <div className="flex h-dvh overflow-hidden">
      {sidebarOpen ? (
        <Sidebar
          threads={threads}
          activeId={threadId}
          error={error}
          onNew={startNewThread}
          onSelect={openThread}
          onDelete={(id) => void removeThread(id)}
          onCollapse={() => setSidebarOpen(false)}
        />
      ) : null}

      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {loadingThread ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/70 text-sm text-muted-foreground">
            Loading…
          </div>
        ) : null}
        {!loadingThread ? (
          <ChatPanel
            key={threadId}
            chatUrl={chatUrl}
            uploadUrl={uploadUrl}
            threadId={threadId}
            initialMessages={initialMessages}
            sidebarOpen={sidebarOpen}
            onShowSidebar={() => setSidebarOpen(true)}
            onActivity={() => void refreshThreads()}
          />
        ) : null}
      </div>
    </div>
  );
}
