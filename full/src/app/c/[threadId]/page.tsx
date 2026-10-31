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
  const { chatUrl, threadsUrl, uploadUrl } = getConfig();

  if (!chatUrl || !threadsUrl || !uploadUrl) {
    return <EnvMissing />;
  }

  if (!threadId.trim()) {
    return <EnvMissing />;
  }

  return (
    <ChatApp
      chatUrl={chatUrl}
      threadsUrl={threadsUrl}
      uploadUrl={uploadUrl}
      threadId={threadId}
    />
  );
}
