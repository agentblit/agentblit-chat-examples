# Full Agentblit chat UI

Reference UI with threads in the URL, file attachments, markdown, collapsible
tool activity, approvals, elicitation forms, and chat access auth. Built on AI
SDK `useChat`.

For the smallest working client, see [`../simplest`](../simplest).

```bash
cp .env.example .env.local
# set NEXT_PUBLIC_AGENTBLIT_AGENT_ID (+ API/app base if not localhost:3000)
pnpm install
pnpm dev
```

Runs on [http://localhost:3002](http://localhost:3002).

## Auth (non-public agents)

In the Agentblit console, set the agent **Access** mode, then add this app under
**Allowed origins**:

```text
http://localhost:3002
```

Flow:

1. Threads request returns `401` → redirect to
   `{APP_URL}/chat/authorize?agent_id=…&origin=http://localhost:3002`
2. After Agentblit login, console redirects to
   `/auth/chat/callback?code=…` on this origin
3. Callback exchanges the code:
   `POST {API_BASE}/api/v2/agents/{id}/session` → JWT in `sessionStorage`
4. Chat, threads, and upload send `Authorization: Bearer <token>`
5. `403` means the signed-in user is not on the allowlist — use **Sign out**
   and try another account

Public agents need no token.

## Features beyond simplest

- `/c/{threadId}` — reload restores the thread
- Sidebar: list / new / delete threads
- Paperclip upload → `sendMessage({ text, files })`
- Markdown assistant replies
- Collapsed “Used N tools” activity
- Inline elicitation forms (`addToolOutput`)
- Computer screenshots arrive as normal AI SDK `file` parts (when the tool sets `share_with_user`)
- MCP Apps: stream `data-mcp-app`; host the iframe via
  `POST /api/v2/agents/{id}/threads/{threadId}/apps/bridge`
  (`tools/call`, `resources/read`, `ui/update-model-context`)
- Auth handoff for `authenticated` / `allowlist` agents

## Layout

| File | Role |
| --- | --- |
| `src/app/page.tsx` | Redirects to `/c/{threadId}` |
| `src/app/c/[threadId]/page.tsx` | Thread route |
| `src/app/auth/chat/callback/page.tsx` | Login code → JWT |
| `src/components/chat-app.tsx` | Sidebar + auth gate + active chat |
| `src/components/chat-panel.tsx` | `useChat` + composer |
| `src/components/message.tsx` | Markdown, files, approvals, elicitation |
| `src/lib/api.ts` | Threads CRUD |
| `src/lib/auth.ts` | JWT storage, authorize, exchange |
| `src/lib/upload.ts` | Presign + PUT → `FileUIPart[]` |
