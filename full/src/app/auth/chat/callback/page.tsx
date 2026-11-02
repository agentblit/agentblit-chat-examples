"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { exchangeChatLoginCode } from "@/lib/auth";
import { getConfig } from "@/lib/config";

function CallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState("");
  const { apiBase, agentId } = getConfig();

  useEffect(() => {
    const code = searchParams.get("code")?.trim() ?? "";
    if (!apiBase || !agentId) {
      setError("Missing Agentblit API base or agent id in env.");
      return;
    }
    if (!code) {
      setError("Missing login code.");
      return;
    }

    let cancelled = false;
    void exchangeChatLoginCode({ apiBase, agentId, code })
      .then(() => {
        if (!cancelled) router.replace("/");
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Sign in failed");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [agentId, apiBase, router, searchParams]);

  if (error) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-sm font-medium text-foreground">Sign in failed</p>
        <p className="text-sm text-destructive">{error}</p>
        <a
          href="/"
          className="cursor-pointer text-sm text-muted-foreground underline hover:text-foreground"
        >
          Back to chat
        </a>
      </main>
    );
  }

  return (
    <main className="flex min-h-dvh items-center justify-center px-6">
      <p className="text-sm text-muted-foreground">Completing sign in…</p>
    </main>
  );
}

export default function ChatAuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-dvh items-center justify-center px-6">
          <p className="text-sm text-muted-foreground">Completing sign in…</p>
        </main>
      }
    >
      <CallbackInner />
    </Suspense>
  );
}
