const TOKEN_PREFIX = "agentblit_chat_token:";

export class ChatApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ChatApiError";
    this.status = status;
  }
}

export function chatTokenStorageKey(agentId: string): string {
  return `${TOKEN_PREFIX}${agentId}`;
}

export function getChatAccessToken(agentId: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return sessionStorage.getItem(chatTokenStorageKey(agentId));
  } catch {
    return null;
  }
}

export function setChatAccessToken(agentId: string, token: string): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(chatTokenStorageKey(agentId), token);
  } catch {
    // ignore quota / private mode
  }
}

export function clearChatAccessToken(agentId: string): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(chatTokenStorageKey(agentId));
  } catch {
    // ignore
  }
}

export function chatAuthHeaders(agentId: string): Record<string, string> {
  const token = getChatAccessToken(agentId);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** Dedupes React Strict Mode double-mount (one-time code can only redeem once). */
const exchangeInflight = new Map<string, Promise<string>>();

export async function exchangeChatLoginCode(options: {
  apiBase: string;
  agentId: string;
  code: string;
}): Promise<string> {
  const key = `${options.agentId}:${options.code}`;
  const existing = exchangeInflight.get(key);
  if (existing) return existing;

  const promise = (async () => {
    const res = await fetch(
      `${options.apiBase}/api/v2/agents/${encodeURIComponent(options.agentId)}/session`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: options.code }),
      },
    );
    const data = (await res.json()) as {
      ok?: boolean;
      token?: string;
      error?: string;
    };
    if (!res.ok || !data.ok || !data.token) {
      throw new Error(data.error ?? "Could not complete sign in");
    }
    setChatAccessToken(options.agentId, data.token);
    return data.token;
  })();

  exchangeInflight.set(key, promise);
  try {
    return await promise;
  } catch (err) {
    exchangeInflight.delete(key);
    throw err;
  }
}

/** Top-level redirect to Agentblit Sign in, then back via `/auth/chat/callback`. */
export function startChatLoginRedirect(options: {
  appUrl: string;
  agentId: string;
}): void {
  const url = new URL(`${options.appUrl}/chat/authorize`);
  url.searchParams.set("agent_id", options.agentId);
  url.searchParams.set("origin", window.location.origin);
  window.location.assign(url.toString());
}

/** Clear chat JWT and Agentblit console session, then return here. */
export function startChatSignOutRedirect(options: {
  appUrl: string;
  agentId: string;
}): void {
  clearChatAccessToken(options.agentId);
  const url = new URL(`${options.appUrl}/chat/sign-out`);
  url.searchParams.set("agent_id", options.agentId);
  url.searchParams.set("return_to", window.location.href);
  window.location.assign(url.toString());
}
