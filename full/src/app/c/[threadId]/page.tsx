"use client";

import { use } from "react";
import { ChatApp } from "@/components/chat-app";
import { EnvMissing } from "@/components/env-missing";
import { getConfig } from "@/lib/config";

type Props = {
  params: Promise<{ threadId: string }>;
};

export default function ThreadPage({ params }: Props) {
  const { threadId } = use(params);
  const { appUrl, agentId, chatUrl, threadsUrl, uploadUrl } = getConfig();

  if (!appUrl || !agentId || !chatUrl || !threadsUrl || !uploadUrl) {
    return <EnvMissing />;
  }

  if (!threadId.trim()) {
    return <EnvMissing />;
  }

  return (
    <ChatApp
      appUrl={appUrl}
      agentId={agentId}
      chatUrl={chatUrl}
      threadsUrl={threadsUrl}
      uploadUrl={uploadUrl}
      threadId={threadId}
    />
  );
}
