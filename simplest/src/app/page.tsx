"use client";

import { Chat } from "@/components/chat";
import { getConfig } from "@/lib/config";

export default function Page() {
  const { chatUrl } = getConfig();
  if (!chatUrl) {
    return (
      <main className="flex h-dvh items-center justify-center p-6 text-sm text-muted-foreground">
        Set <code className="mx-1">NEXT_PUBLIC_AGENTBLIT_AGENT_ID</code> in{" "}
        <code className="mx-1">.env.local</code>.
      </main>
    );
  }
  return <Chat chatUrl={chatUrl} />;
}
