"use client";

import { useChat } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithApprovalResponses,
  lastAssistantMessageIsCompleteWithToolCalls,
  type UIMessage,
} from "ai";
import { ArrowUp, Paperclip, PanelLeft, Square, X } from "lucide-react";
import {
  type FormEvent,
  type KeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/cn";
import { uploadChatFiles } from "@/lib/upload";
import { Message, type ElicitationSubmit } from "./message";

const MAX_FILES = 5;
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ACCEPT = "image/*,application/pdf,text/*,.md,.csv,.json,.yaml,.yml,.xml";

type Props = {
  chatUrl: string;
  uploadUrl: string;
  threadId: string;
  initialMessages: UIMessage[];
  sidebarOpen: boolean;
  onShowSidebar: () => void;
  onActivity: () => void;
};

/**
 * One chat thread — remount with `key={threadId}` when switching.
 * Uses AI SDK `useChat` + `DefaultChatTransport` against Agentblit v2.
 */
export function ChatPanel({
  chatUrl,
  uploadUrl,
  threadId,
  initialMessages,
  sidebarOpen,
  onShowSidebar,
  onActivity,
}: Props) {
  const transport = useMemo(
    () => new DefaultChatTransport({ api: chatUrl }),
    [chatUrl],
  );

  const {
    messages,
    sendMessage,
    status,
    addToolApprovalResponse,
    addToolOutput,
    error,
    stop,
  } = useChat({
    id: threadId,
    messages: initialMessages,
    transport,
    sendAutomaticallyWhen: ({ messages: current }) =>
      lastAssistantMessageIsCompleteWithApprovalResponses({
        messages: current,
      }) || lastAssistantMessageIsCompleteWithToolCalls({ messages: current }),
    onFinish: () => {
      onActivity();
    },
  });

  const [input, setInput] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [localError, setLocalError] = useState("");
  const scrollerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const busy = status === "submitted" || status === "streaming";
  const canSend =
    (input.trim().length > 0 || files.length > 0) &&
    status === "ready" &&
    !uploading;

  useEffect(() => {
    const el = scrollerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, status]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [input]);

  function addFiles(list: FileList | null) {
    if (!list) return;
    setFiles((current) => {
      const next = [...current];
      for (const file of list) {
        if (next.length >= MAX_FILES) {
          setLocalError(`Attach up to ${MAX_FILES} files.`);
          break;
        }
        if (file.size > MAX_FILE_BYTES) {
          setLocalError(`${file.name} is larger than 10 MB.`);
          continue;
        }
        next.push(file);
      }
      return next;
    });
  }

  async function submit() {
    const text = input.trim();
    if ((!text && files.length === 0) || status !== "ready") return;
    setLocalError("");
    const pending = files;
    setInput("");
    setFiles([]);
    setUploading(true);
    try {
      const uploaded = await uploadChatFiles(uploadUrl, pending);
      if (text && uploaded.length > 0) {
        await sendMessage({ text, files: uploaded });
      } else if (uploaded.length > 0) {
        await sendMessage({ files: uploaded });
      } else {
        await sendMessage({ text });
      }
    } catch (err) {
      setFiles(pending);
      setInput(text);
      setLocalError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
    textareaRef.current?.focus();
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

  function submitElicitation(result: ElicitationSubmit) {
    void Promise.resolve(
      addToolOutput({
        tool: result.toolName as never,
        toolCallId: result.toolCallId,
        output: {
          action: result.action,
          ...(result.content ? { content: result.content } : {}),
        },
      }),
    ).then(onActivity);
  }

  const lastMessage = messages[messages.length - 1];

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <header className="flex shrink-0 items-center gap-2 px-4 py-3 sm:px-6">
        {!sidebarOpen ? (
          <button
            type="button"
            onClick={onShowSidebar}
            className="cursor-pointer rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label="Open sidebar"
            title="Open sidebar"
          >
            <PanelLeft className="h-4 w-4" />
          </button>
        ) : null}
        <p className="text-sm font-medium text-foreground">Agentblit</p>
      </header>

      <div
        ref={scrollerRef}
        className="min-h-0 flex-1 overflow-y-auto px-4 sm:px-6"
      >
        <div className="mx-auto flex min-h-full max-w-2xl flex-col pb-4">
          {messages.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center py-20 text-center">
              <h1 className="text-2xl font-medium tracking-tight text-foreground sm:text-3xl">
                How can I help you today?
              </h1>
              <p className="mt-3 max-w-sm text-sm text-muted-foreground">
                Ask anything. Approvals and follow-up forms appear inline.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-6 py-4">
              {messages.map((message, index) => {
                const isLast = index === messages.length - 1;
                const isStreamingAssistant =
                  busy && isLast && message.role === "assistant";
                const superseded = messages
                  .slice(index + 1)
                  .some((later) => later.role === "user");
                return (
                  <Message
                    key={message.id}
                    message={message}
                    isStreaming={isStreamingAssistant}
                    superseded={superseded}
                    onApprove={(id, approved) => {
                      void Promise.resolve(
                        addToolApprovalResponse({ id, approved }),
                      ).then(onActivity);
                    }}
                    onElicitation={submitElicitation}
                  />
                );
              })}
              {busy && lastMessage?.role !== "assistant" ? (
                <p className="text-sm text-muted-foreground">Thinking…</p>
              ) : null}
            </div>
          )}

          {localError || error ? (
            <p className="mt-2 text-sm text-destructive">
              {localError || error?.message}
            </p>
          ) : null}
        </div>
      </div>

      <div className="shrink-0 px-4 pb-5 pt-2 sm:px-6">
        <form onSubmit={onSubmit} className="mx-auto max-w-2xl">
          <div className="rounded-2xl bg-card shadow-composer">
            {files.length > 0 ? (
              <div className="flex flex-wrap gap-2 px-3 pt-3">
                {files.map((file, index) => (
                  <span
                    key={`${file.name}-${index}`}
                    className="inline-flex max-w-48 items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs text-foreground"
                  >
                    <span className="truncate">{file.name || "file"}</span>
                    <button
                      type="button"
                      className="cursor-pointer text-muted-foreground hover:text-foreground"
                      aria-label={`Remove ${file.name}`}
                      onClick={() =>
                        setFiles((current) =>
                          current.filter((_, i) => i !== index),
                        )
                      }
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            ) : null}
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Message…"
              rows={1}
              className="block max-h-50 w-full resize-none bg-transparent px-4 pb-2 pt-3.5 text-sm leading-relaxed text-foreground outline-none placeholder:text-muted-foreground"
            />
            <div className="flex items-center justify-between px-3 pb-3">
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPT}
                multiple
                className="hidden"
                onChange={(event) => {
                  addFiles(event.target.files);
                  event.target.value = "";
                }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={busy || uploading}
                className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Attach files"
                title="Attach files"
              >
                <Paperclip className="h-4 w-4" />
              </button>
              {busy ? (
                <button
                  type="button"
                  onClick={() => stop()}
                  className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground"
                  aria-label="Stop generating"
                  title="Stop"
                >
                  <Square className="h-3.5 w-3.5 fill-current" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!canSend}
                  className={cn(
                    "inline-flex h-9 w-9 items-center justify-center rounded-full",
                    "bg-primary text-primary-foreground",
                    canSend
                      ? "cursor-pointer"
                      : "cursor-not-allowed opacity-40",
                  )}
                  aria-label="Send message"
                >
                  <ArrowUp className="h-4 w-4" strokeWidth={2.5} />
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
