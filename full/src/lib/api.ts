import type { UIMessage } from "ai";
import { ChatApiError, chatAuthHeaders } from "@/lib/auth";

export type ThreadSummary = {
  id: string;
  title: string;
  updated_at: string;
};

type ApiError = { ok?: boolean; error?: string };

async function readJson<T>(res: Response): Promise<T & ApiError> {
  return (await res.json()) as T & ApiError;
}

function headers(agentId: string): HeadersInit {
  return chatAuthHeaders(agentId);
}

export async function listThreads(
  threadsUrl: string,
  agentId: string,
): Promise<ThreadSummary[]> {
  const res = await fetch(threadsUrl, { headers: headers(agentId) });
  const data = await readJson<{ threads?: ThreadSummary[] }>(res);
  if (!res.ok || !data.ok) {
    throw new ChatApiError(data.error ?? "Failed to load threads", res.status);
  }
  return data.threads ?? [];
}

export async function loadThreadMessages(
  threadsUrl: string,
  threadId: string,
  agentId: string,
): Promise<UIMessage[]> {
  const res = await fetch(`${threadsUrl}/${threadId}/messages`, {
    headers: headers(agentId),
  });
  const data = await readJson<{
    messages?: Array<{ id: string; role: string; parts: unknown[] }>;
  }>(res);
  if (!res.ok || !data.ok) {
    throw new ChatApiError(data.error ?? "Failed to load messages", res.status);
  }
  return (data.messages ?? []).map((message) => ({
    id: message.id,
    role: message.role as UIMessage["role"],
    parts: (message.parts ?? []) as UIMessage["parts"],
  }));
}

export async function deleteThread(
  threadsUrl: string,
  threadId: string,
  agentId: string,
): Promise<void> {
  const res = await fetch(`${threadsUrl}/${threadId}`, {
    method: "DELETE",
    headers: headers(agentId),
  });
  const data = await readJson<Record<string, never>>(res);
  if (!res.ok || !data.ok) {
    throw new ChatApiError(data.error ?? "Failed to delete thread", res.status);
  }
}
