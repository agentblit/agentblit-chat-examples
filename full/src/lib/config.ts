/** Public Agentblit chat endpoint config (set in `.env.local`). */
export function getConfig() {
  const apiBase = process.env.NEXT_PUBLIC_AGENTBLIT_API_BASE?.replace(/\/$/, "");
  const agentId = process.env.NEXT_PUBLIC_AGENTBLIT_AGENT_ID;
  return {
    apiBase,
    agentId,
    chatUrl:
      apiBase && agentId
        ? `${apiBase}/api/v2/agents/${agentId}/chat`
        : undefined,
    threadsUrl:
      apiBase && agentId
        ? `${apiBase}/api/v2/agents/${agentId}/threads`
        : undefined,
    uploadUrl:
      apiBase && agentId
        ? `${apiBase}/api/v2/agents/${agentId}/files/upload`
        : undefined,
  };
}
