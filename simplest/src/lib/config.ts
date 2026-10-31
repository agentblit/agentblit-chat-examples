export function getConfig() {
  const apiBase = (process.env.NEXT_PUBLIC_AGENTBLIT_API_BASE ?? "").replace(
    /\/$/,
    "",
  );
  const agentId = process.env.NEXT_PUBLIC_AGENTBLIT_AGENT_ID?.trim() ?? "";
  return {
    chatUrl:
      apiBase && agentId
        ? `${apiBase}/api/v2/agents/${agentId}/chat`
        : undefined,
  };
}
