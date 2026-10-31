# Full Agentblit chat UI

Reference UI with threads in the URL, file attachments, markdown, collapsible
tool activity, approvals, and elicitation forms. Built on AI SDK `useChat`.

For the smallest working client, see [`../simplest`](../simplest).

```bash
cp .env.example .env.local
# set NEXT_PUBLIC_AGENTBLIT_AGENT_ID (+ API base if not localhost:3000)
pnpm install
pnpm dev
```

Runs on [http://localhost:3002](http://localhost:3002).

## Features beyond simplest

- `/c/{threadId}` — reload restores the thread
- Sidebar: list / new / delete threads
- Paperclip upload → `sendMessage({ text, files })`
- Markdown assistant replies
- Collapsed “Used N tools” activity
- Inline elicitation forms (`addToolOutput`)

## Layout

| File | Role |
| --- | --- |
| `src/app/page.tsx` | Redirects to `/c/{threadId}` |
| `src/app/c/[threadId]/page.tsx` | Thread route |
| `src/components/chat-app.tsx` | Sidebar + active chat |
| `src/components/chat-panel.tsx` | `useChat` + composer |
| `src/components/message.tsx` | Markdown, files, approvals, elicitation |
| `src/lib/api.ts` | Threads CRUD |
| `src/lib/upload.ts` | Presign + PUT → `FileUIPart[]` |
