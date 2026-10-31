# Simplest Agentblit chat UI

The smallest useful client against Agentblit chat v2: AI SDK `useChat`, text,
stop, and tool approvals. No threads, files, markdown, or elicitation forms.

```bash
cp .env.example .env.local
# set NEXT_PUBLIC_AGENTBLIT_AGENT_ID
pnpm install
pnpm dev
```

Runs on [http://localhost:3001](http://localhost:3001). Point
`NEXT_PUBLIC_AGENTBLIT_API_BASE` at your Agentblit server (default
`http://localhost:3000`).

## The whole chat hook

```tsx
const { messages, sendMessage, addToolApprovalResponse, stop } = useChat({
  id: threadId,
  transport: new DefaultChatTransport({
    api: `${API}/api/v2/agents/${agentId}/chat`,
  }),
  sendAutomaticallyWhen: ({ messages }) =>
    lastAssistantMessageIsCompleteWithApprovalResponses({ messages }) ||
    lastAssistantMessageIsCompleteWithToolCalls({ messages }),
});

await sendMessage({ text });
addToolApprovalResponse({ id: approvalId, approved: true });
```

See `../full` for threads, file uploads, markdown, tool activity, and
elicitation.
