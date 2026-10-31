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

{ "id": "<thread id>", "messages": [ /* AI SDK UI messages */ ] }
```

- Response: AI SDK UI message stream.
- Server owns LLM history. Client sends `id` + latest messages for decisions.
- Approvals / elicitation resume the same assistant message.
- Optional: threads CRUD and file upload (used by `full/`).

Start with **`simplest/`**. Copy that wiring into your app, then pull pieces
from **`full/`** only when you need them.
