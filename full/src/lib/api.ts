import type { UIMessage } from "ai";

export type ThreadSummary = {
  id: string;
  title: string;
  updated_at: string;
};

type ApiError = { ok?: boolean; error?: string };

async function readJson<T>(res: Response): Promise<T & ApiError> {
  return (await res.json()) as T & ApiError;
}

export async function listThreads(threadsUrl: string): Promise<ThreadSummary[]> {
  const res = await fetch(threadsUrl);
  const data = await readJson<{ threads?: ThreadSummary[] }>(res);
  if (!res.ok || !data.ok) {
    throw new Error(data.error ?? "Failed to load threads");
  }
  return data.threads ?? [];
}

export async function loadThreadMessages(
  threadsUrl: string,
  threadId: string,
): Promise<UIMessage[]> {
  const res = await fetch(`${threadsUrl}/${threadId}/messages`);
  const data = await readJson<{
    messages?: Array<{ id: string; role: string; parts: unknown[] }>;
  }>(res);
  if (!res.ok || !data.ok) {
    throw new Error(data.error ?? "Failed to load messages");
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
): Promise<void> {
  const res = await fetch(`${threadsUrl}/${threadId}`, { method: "DELETE" });
  const data = await readJson<Record<string, never>>(res);
  if (!res.ok || !data.ok) {
    throw new Error(data.error ?? "Failed to delete thread");
  }
}
