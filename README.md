# Agentblit chat UI examples

Public reference apps for [Agentblit](https://agentblit.com) **chat v2**: a
standard [AI SDK](https://ai-sdk.dev) `useChat` client against the UI message
stream.

| Folder | What it shows | Port |
| --- | --- | --- |
| [`simplest/`](./simplest) | Text + stop + tool approvals | 3001 |
| [`full/`](./full) | Threads, files, markdown, tool activity, elicitation | 3002 |

## Prerequisites

1. An Agentblit server running locally (or remote), with chat v2 enabled.
2. An agent id.
3. Node 20+ and `pnpm`.

```bash
# Terminal A — Agentblit
cd /path/to/agentblit && pnpm dev   # usually :3000

# Terminal B — pick one example
cd simplest   # or full
cp .env.example .env.local
# set NEXT_PUBLIC_AGENTBLIT_AGENT_ID=...
pnpm install
pnpm dev
```

## Contract (both examples)

```http
POST {API_BASE}/api/v2/agents/{agentId}/chat
Content-Type: application/json
Authorization: Bearer <chat-jwt>   # required when agent access is not public

{ "id": "<thread id>", "messages": [ /* AI SDK UI messages */ ] }
```

- Response: AI SDK UI message stream.
- Server owns LLM history. Client sends `id` + latest messages for decisions.
- Approvals / elicitation resume the same assistant message.
- Optional: threads CRUD and file upload (used by `full/`).

### Auth (non-public agents)

Agent access is set in the Agentblit console (**Access**): `public`,
`authenticated`, or `allowlist`.

1. Add your example origin under **Allowed origins** (e.g. `http://localhost:3002`).
2. On `401`, send the user through Agentblit Sign in:
   `{APP_URL}/chat/authorize?agent_id=…&origin={window.location.origin}`
   (use `popup=1` for embeds; top-level apps can omit it and handle
   `/auth/chat/callback`).
3. Exchange the one-time code: `POST /api/v2/agents/{id}/session` `{ "code" }` → JWT.
4. Send `Authorization: Bearer <token>` on chat, threads, and upload.
5. On `403`, the signed-in user is not on the allowlist.

**`full/`** implements this end to end. **`simplest/`** is still public-only —
copy `full/src/lib/auth.ts` and the callback route when you need gated access.

Public agents need no token. For thread separation from a custom origin, send
`X-Agentblit-User: <stable-anonymous-id>` (public mode only).
