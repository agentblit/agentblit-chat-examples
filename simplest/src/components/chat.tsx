"use client";

import { useChat } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  generateId,
  isToolUIPart,
  lastAssistantMessageIsCompleteWithApprovalResponses,
  lastAssistantMessageIsCompleteWithToolCalls,
  type UIMessage,
} from "ai";
import { useMemo, useState, type FormEvent, type KeyboardEvent } from "react";

type Props = { chatUrl: string };

/**
 * Minimal Agentblit chat:
 * - AI SDK `useChat` + `DefaultChatTransport`
 * - text send / stop
 * - tool approval Allow / Deny
 */
export function Chat({ chatUrl }: Props) {
  const threadId = useMemo(() => generateId(), []);
  const transport = useMemo(
    () => new DefaultChatTransport({ api: chatUrl }),
    [chatUrl],
  );

  const {
    messages,
    sendMessage,
    status,
    error,
    stop,
    addToolApprovalResponse,
  } = useChat({
    id: threadId,
    transport,
    sendAutomaticallyWhen: ({ messages: current }) =>
      lastAssistantMessageIsCompleteWithApprovalResponses({
        messages: current,
      }) ||
      lastAssistantMessageIsCompleteWithToolCalls({ messages: current }),
  });

  const [input, setInput] = useState("");
  const busy = status === "submitted" || status === "streaming";
  const canSend = input.trim().length > 0 && status === "ready";

  async function submit() {
    const text = input.trim();
    if (!text || status !== "ready") return;
    setInput("");
    await sendMessage({ text });
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void submit();
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void submit();
    }
  }

  return (
    <div className="mx-auto flex h-dvh max-w-2xl flex-col px-4">
      <header className="shrink-0 py-4 text-sm font-medium">Agentblit</header>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pb-4">
        {messages.length === 0 ? (
          <p className="pt-16 text-center text-sm text-muted-foreground">
            Send a message to start.
          </p>
        ) : (
          messages.map((message) => (
            <MessageRow
              key={message.id}
              message={message}
              onApprove={(id, approved) => {
                void addToolApprovalResponse({ id, approved });
              }}
            />
          ))
        )}
        {error ? (
          <p className="text-sm text-destructive">{error.message}</p>
        ) : null}
      </div>

      <form onSubmit={onSubmit} className="shrink-0 pb-5">
        <div className="rounded-md border border-border bg-card p-3">
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Message…"
            rows={2}
            className="w-full resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <div className="mt-2 flex justify-end gap-2">
            {busy ? (
              <button
                type="button"
                onClick={() => stop()}
                className="cursor-pointer rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground"
              >
                Stop
              </button>
            ) : (
              <button
                type="submit"
                disabled={!canSend}
                className="cursor-pointer rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground disabled:cursor-not-allowed disabled:opacity-40"
              >
                Send
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}

function MessageRow({
  message,
  onApprove,
}: {
  message: UIMessage;
  onApprove: (approvalId: string, approved: boolean) => void;
}) {
  const isUser = message.role === "user";
  const text = message.parts
    .filter(
      (part): part is { type: "text"; text: string } => part.type === "text",
    )
    .map((part) => part.text)
    .join("");

  const approvals = message.parts.filter(
    (part) =>
      isToolUIPart(part) &&
      part.state === "approval-requested" &&
      !part.approval.isAutomatic,
  );

  return (
    <div className={isUser ? "flex justify-end" : "flex justify-start"}>
      <div className="max-w-[min(100%,36rem)] space-y-2 text-sm">
        {approvals.map((part) => {
          if (!isToolUIPart(part) || part.state !== "approval-requested") {
            return null;
          }
          const name = part.type.startsWith("tool-")
            ? part.type.slice("tool-".length)
            : "tool";
          return (
            <div
              key={part.toolCallId}
              className="rounded-md border border-border bg-card p-3"
            >
              <p className="text-sm">Approve tool <code>{name}</code>?</p>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  className="cursor-pointer rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground"
                  onClick={() => onApprove(part.approval.id, true)}
                >
                  Allow
                </button>
                <button
                  type="button"
                  className="cursor-pointer rounded-md border border-border px-3 py-1.5 text-xs"
                  onClick={() => onApprove(part.approval.id, false)}
                >
                  Deny
                </button>
              </div>
            </div>
          );
        })}
        {text ? (
          <div
            className={
              isUser
                ? "whitespace-pre-wrap rounded-md bg-user-bubble px-3 py-2"
                : "whitespace-pre-wrap"
            }
          >
            {text}
          </div>
        ) : null}
      </div>
    </div>
  );
}
