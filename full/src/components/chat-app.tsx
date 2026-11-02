"use client";

import { generateId, type UIMessage } from "ai";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  deleteThread,
  listThreads,
  loadThreadMessages,
  type ThreadSummary,
} from "@/lib/api";
import {
  ChatApiError,
  clearChatAccessToken,
  getChatAccessToken,
  startChatLoginRedirect,
  startChatSignOutRedirect,
} from "@/lib/auth";
import { ChatPanel } from "./chat-panel";
import { Sidebar } from "./sidebar";

type AuthGate = "signin" | "forbidden" | "signed_out" | null;

type Props = {
  appUrl: string;
  agentId: string;
  chatUrl: string;
  threadsUrl: string;
  uploadUrl: string;
  /** From `/c/[threadId]` — reload restores this thread. */
  threadId: string;
};

export function ChatApp({
  appUrl,
  agentId,
  chatUrl,
  threadsUrl,
  uploadUrl,
  threadId,
}: Props) {
  const router = useRouter();
  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [initialMessages, setInitialMessages] = useState<UIMessage[]>([]);
  const [loadingThread, setLoadingThread] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [error, setError] = useState("");
  const [authGate, setAuthGate] = useState<AuthGate>(null);
  const [authBusy, setAuthBusy] = useState(false);
  const signInStarted = useRef(false);

  const applyAuthError = useCallback((err: unknown) => {
    if (err instanceof ChatApiError) {
      if (err.status === 401) {
        setAuthGate("signin");
        setError("");
        return;
      }
      if (err.status === 403) {
        setAuthGate("forbidden");
        setError("");
        return;
      }
    }
    setError(err instanceof Error ? err.message : "Failed to load threads");
  }, []);

  const refreshThreads = useCallback(async () => {
    try {
      setThreads(await listThreads(threadsUrl, agentId));
      setAuthGate(null);
      setError("");
    } catch (err) {
      applyAuthError(err);
    }
  }, [agentId, applyAuthError, threadsUrl]);

  const signIn = useCallback(() => {
    setAuthBusy(true);
    startChatLoginRedirect({ appUrl, agentId });
  }, [agentId, appUrl]);

  const signOut = useCallback(() => {
    clearChatAccessToken(agentId);
    setThreads([]);
    setInitialMessages([]);
    setError("");
    startChatSignOutRedirect({ appUrl, agentId });
  }, [agentId, appUrl]);

  useEffect(() => {
    void refreshThreads();
  }, [refreshThreads]);

  // First visit needing auth — go straight to Agentblit login.
  // Do not auto-start after an explicit Sign out (`signed_out`).
  useEffect(() => {
    if (authGate !== "signin") {
      signInStarted.current = false;
      return;
    }
    if (signInStarted.current || authBusy) return;
    signInStarted.current = true;
    signIn();
  }, [authBusy, authGate, signIn]);

  useEffect(() => {
    if (authGate) {
      setLoadingThread(false);
      return;
    }

    let cancelled = false;
    setLoadingThread(true);
    setInitialMessages([]);
    setError("");

    void (async () => {
      try {
        const messages = await loadThreadMessages(
          threadsUrl,
          threadId,
          agentId,
        );
        if (cancelled) return;
        setInitialMessages(messages);
      } catch (err) {
        // New thread id that is not on the server yet — start empty.
        // Auth failures are handled by the threads probe above.
        if (err instanceof ChatApiError && err.status === 404) {
          if (!cancelled) setInitialMessages([]);
        } else if (
          err instanceof ChatApiError &&
          (err.status === 401 || err.status === 403)
        ) {
          if (!cancelled) applyAuthError(err);
        } else if (!cancelled) {
          setInitialMessages([]);
        }
      } finally {
        if (!cancelled) setLoadingThread(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [agentId, applyAuthError, authGate, threadId, threadsUrl]);

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
      await deleteThread(threadsUrl, id, agentId);
      setThreads((prev) => prev.filter((thread) => thread.id !== id));
      if (id === threadId) startNewThread();
      setError("");
    } catch (err) {
      if (err instanceof ChatApiError && (err.status === 401 || err.status === 403)) {
        applyAuthError(err);
        return;
      }
      setError(err instanceof Error ? err.message : "Failed to delete thread");
    }
  }

  if (authGate === "signin") {
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-sm text-muted-foreground">Redirecting to sign in…</p>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </div>
    );
  }

  if (authGate === "forbidden" || authGate === "signed_out") {
    const isForbidden = authGate === "forbidden";
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-sm font-medium text-foreground">
          {isForbidden ? "No access" : "Signed out"}
        </p>
        <p className="text-sm text-muted-foreground">
          {isForbidden
            ? "You are signed in, but this agent is limited to specific users."
            : "Sign in with an account that has access to this agent."}
        </p>
        {isForbidden ? (
          <button
            type="button"
            className="cursor-pointer text-sm text-muted-foreground underline hover:text-foreground"
            onClick={signOut}
          >
            Sign out
          </button>
        ) : (
          <button
            type="button"
            className="inline-flex h-9 cursor-pointer items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-60"
            disabled={authBusy}
            onClick={signIn}
          >
            {authBusy ? "Signing in…" : "Sign in"}
          </button>
        )}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </div>
    );
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
          onSignOut={
            getChatAccessToken(agentId) ? signOut : undefined
          }
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
            agentId={agentId}
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
