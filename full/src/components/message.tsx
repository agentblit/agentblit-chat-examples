"use client";

import { isToolUIPart, type UIMessage } from "ai";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useState, type FormEvent } from "react";
import { cn } from "@/lib/cn";
import { Markdown } from "./markdown";

export type ElicitationSubmit = {
  toolName: string;
  toolCallId: string;
  action: "accept" | "decline" | "cancel";
  content?: Record<string, string>;
};

type Props = {
  message: UIMessage;
  isStreaming?: boolean;
  /** A later user message means this approval was skipped. */
  superseded?: boolean;
  onApprove: (approvalId: string, approved: boolean) => void;
  onElicitation: (result: ElicitationSubmit) => void;
};

type ElicitationRequest = {
  message?: string;
  requestedSchema?: {
    properties?: Record<
      string,
      {
        type?: string;
        title?: string;
        description?: string;
        enum?: string[];
      }
    >;
    required?: string[];
  };
};

type ToolPart = Extract<UIMessage["parts"][number], { toolCallId: string }>;

function elicitationRequest(toolMetadata: unknown): ElicitationRequest | null {
  if (!toolMetadata || typeof toolMetadata !== "object") return null;
  const request = (toolMetadata as { elicitation?: unknown }).elicitation;
  if (!request || typeof request !== "object") return null;
  return request as ElicitationRequest;
}

function toolNameOf(type: string): string {
  return type.startsWith("tool-") ? type.slice("tool-".length) : "tool";
}

const TOOL_STATE_RANK: Record<string, number> = {
  "input-streaming": 1,
  "input-available": 2,
  "approval-requested": 3,
  "approval-responded": 4,
  "output-denied": 5,
  "output-available": 6,
  "output-error": 6,
};

/** Prefer the most advanced tool part when the same toolCallId appears twice. */
function uniqueToolParts(parts: UIMessage["parts"]) {
  const byId = new Map<string, ToolPart>();
  for (const part of parts) {
    if (!isToolUIPart(part)) continue;
    const current = byId.get(part.toolCallId);
    const rank = TOOL_STATE_RANK[part.state] ?? 0;
    const currentRank = current ? (TOOL_STATE_RANK[current.state] ?? 0) : -1;
    if (!current || rank >= currentRank) {
      byId.set(part.toolCallId, part);
    }
  }
  return [...byId.values()];
}

function summarizeInput(input: unknown): string {
  if (input == null) return "";
  if (typeof input === "string") return input.slice(0, 120);
  if (typeof input !== "object") return String(input).slice(0, 120);
  const record = input as Record<string, unknown>;
  for (const key of ["query", "sql", "command", "path", "url", "prompt", "code"]) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) {
      return value.replace(/\s+/g, " ").trim().slice(0, 120);
    }
  }
  try {
    return JSON.stringify(input).slice(0, 120);
  } catch {
    return "";
  }
}

function activityLabel(part: ToolPart): string {
  const name = toolNameOf(part.type);
  if (part.state === "output-denied") return `Denied ${name}`;
  if (part.state === "approval-requested") return `Denied ${name}`;
  if (part.state === "input-available") return `Cancelled ${name}`;
  if (
    part.state === "approval-responded" &&
    part.approval?.approved === false
  ) {
    return `Denied ${name}`;
  }
  if (part.state === "approval-responded") return `Allowed ${name}`;
  if (part.state === "output-error") return `Failed ${name}`;
  return `Used ${name}`;
}

function collapsedSummary(parts: ToolPart[]): string {
  if (parts.length === 1) return activityLabel(parts[0]!);
  const names = [...new Set(parts.map((part) => toolNameOf(part.type)))];
  if (names.length === 1) {
    return `Used ${names[0]} ${parts.length} times`;
  }
  return `Used ${parts.length} tools`;
}

/** One chat bubble. Assistant text is markdown; approvals + elicitation render inline. */
export function Message({
  message,
  isStreaming = false,
  superseded = false,
  onApprove,
  onElicitation,
}: Props) {
  const isUser = message.role === "user";
  const text = message.parts
    .filter((part): part is { type: "text"; text: string } => part.type === "text")
    .map((part) => part.text)
    .join("");

  const tools = uniqueToolParts(message.parts);
  const interactive: ToolPart[] = [];
  const completed: ToolPart[] = [];

  for (const part of tools) {
    const request = elicitationRequest(part.toolMetadata);

    if (request && part.state === "input-available") {
      if (superseded) completed.push(part);
      else interactive.push(part);
      continue;
    }

    if (part.state === "approval-requested" && !part.approval.isAutomatic) {
      if (superseded) {
        if (!text.trim()) completed.push(part);
      } else {
        interactive.push(part);
      }
      continue;
    }

    if (
      (part.state === "output-available" && part.providerExecuted) ||
      part.state === "approval-responded" ||
      part.state === "output-denied" ||
      part.state === "output-error"
    ) {
      if (text.trim() && part.state === "approval-responded") continue;
      completed.push(part);
    }
  }

  return (
    <div className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[min(100%,40rem)] text-sm leading-relaxed",
          isUser ? "flex flex-col items-end gap-2" : "w-full text-foreground",
        )}
      >
        {isUser ? (
          <>
            <MessageFiles parts={message.parts} align="end" />
            {text ? (
              <div className="whitespace-pre-wrap break-words rounded-2xl bg-user-bubble px-4 py-2.5 text-foreground">
                {text}
              </div>
            ) : null}
          </>
        ) : (
          <div className="flex flex-col gap-3">
            {completed.length > 0 ? (
              <ToolActivity details={completed} />
            ) : null}

            {interactive.map((part) => {
              const name = toolNameOf(part.type);
              const request = elicitationRequest(part.toolMetadata);

              if (request && part.state === "input-available") {
                return (
                  <ElicitationCard
                    key={`${message.id}-elicit-${part.toolCallId}`}
                    toolName={name}
                    toolCallId={part.toolCallId}
                    request={request}
                    onSubmit={onElicitation}
                  />
                );
              }

              if (part.state === "approval-requested" && !part.approval.isAutomatic) {
                const approval = part.approval;
                return (
                  <ApprovalCard
                    key={`${message.id}-${part.toolCallId}`}
                    toolName={name}
                    input={part.input}
                    reason={approval.requestReason}
                    onApprove={() => onApprove(approval.id, true)}
                    onDeny={() => onApprove(approval.id, false)}
                  />
                );
              }

              return null;
            })}

            <MessageFiles parts={message.parts} />

            {text ? (
              <div className="break-words">
                <Markdown content={text} />
                {isStreaming ? (
                  <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse bg-foreground/70 align-text-bottom" />
                ) : null}
              </div>
            ) : isStreaming ? (
              <p className="text-sm text-muted-foreground">Thinking…</p>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

/** Claude-style: one summary line; expand to see each tool call. */
function ToolActivity({ details }: { details: ToolPart[] }) {
  const [open, setOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="text-sm">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex cursor-pointer items-center gap-1 text-muted-foreground hover:text-foreground"
        aria-expanded={open}
      >
        <span>{collapsedSummary(details)}</span>
        {open ? (
          <ChevronDown className="h-3.5 w-3.5" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5" />
        )}
      </button>

      {open ? (
        <div className="mt-2 overflow-hidden rounded-md border border-border bg-card">
          {details.map((part, index) => {
            const label = activityLabel(part);
            const summary = summarizeInput(part.input);
            const isRowOpen = expandedId === part.toolCallId;
            const hasDetail = part.input != null || ("output" in part && part.output != null);

            return (
              <div
                key={part.toolCallId}
                className={cn(
                  index > 0 ? "border-t border-border" : null,
                )}
              >
                <button
                  type="button"
                  disabled={!hasDetail}
                  onClick={() =>
                    setExpandedId((id) =>
                      id === part.toolCallId ? null : part.toolCallId,
                    )
                  }
                  className={cn(
                    "flex w-full items-start gap-2 px-3 py-2.5 text-left",
                    hasDetail
                      ? "cursor-pointer hover:bg-muted/60"
                      : "cursor-default",
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-muted-foreground">
                      <span>{label}</span>
                      {summary ? (
                        <>
                          {" "}
                          <span className="text-foreground">{summary}</span>
                        </>
                      ) : null}
                    </p>
                  </div>
                  {hasDetail ? (
                    <ChevronRight
                      className={cn(
                        "mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform",
                        isRowOpen ? "rotate-90" : null,
                      )}
                    />
                  ) : null}
                </button>
                {isRowOpen && hasDetail ? (
                  <pre className="max-h-48 overflow-auto border-t border-border bg-muted/40 px-3 py-2 font-mono text-xs text-muted-foreground">
                    {JSON.stringify(
                      {
                        ...("input" in part ? { input: part.input } : {}),
                        ...("output" in part && part.output != null
                          ? { output: part.output }
                          : {}),
                      },
                      null,
                      2,
                    )}
                  </pre>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function MessageFiles({
  parts,
  align = "start",
}: {
  parts: UIMessage["parts"];
  align?: "start" | "end";
}) {
  const files = parts.filter(
    (part): part is { type: "file"; mediaType: string; url: string; filename?: string } =>
      part.type === "file",
  );
  if (files.length === 0) return null;
  return (
    <div
      className={cn(
        "flex flex-col gap-2",
        align === "end" ? "items-end" : "items-start",
      )}
    >
      {files.map((file) =>
        file.mediaType.startsWith("image/") ? (
          <img
            key={file.url}
            src={file.url}
            alt={file.filename ?? "Attached image"}
            className="max-h-64 max-w-full rounded-md border border-border bg-card object-contain"
          />
        ) : (
          <a
            key={file.url}
            href={file.url}
            target="_blank"
            rel="noreferrer"
            className="max-w-64 truncate rounded-md border border-border bg-card px-3 py-2 text-xs text-foreground underline"
          >
            {file.filename ?? "File"}
          </a>
        ),
      )}
    </div>
  );
}

function ApprovalCard({
  toolName,
  input,
  reason,
  onApprove,
  onDeny,
}: {
  toolName: string;
  input: unknown;
  reason?: string;
  onApprove: () => void;
  onDeny: () => void;
}) {
  return (
    <div className="mt-4 rounded-2xl border border-border bg-card p-4 shadow-composer">
      <p className="text-sm font-medium text-foreground">
        {reason ?? `Allow ${toolName}?`}
      </p>
      {input != null ? (
        <pre className="mt-3 max-h-40 overflow-auto rounded-md bg-muted p-3 font-mono text-xs text-muted-foreground">
          {JSON.stringify(input, null, 2)}
        </pre>
      ) : null}
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          className="cursor-pointer rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground"
          onClick={onApprove}
        >
          Allow
        </button>
        <button
          type="button"
          className="cursor-pointer rounded-full bg-accent px-4 py-2 text-xs font-medium text-accent-foreground"
          onClick={onDeny}
        >
          Deny
        </button>
      </div>
    </div>
  );
}

function ElicitationCard({
  toolName,
  toolCallId,
  request,
  onSubmit,
}: {
  toolName: string;
  toolCallId: string;
  request: ElicitationRequest;
  onSubmit: (result: ElicitationSubmit) => void;
}) {
  const properties = request.requestedSchema?.properties ?? {};
  const required = new Set(request.requestedSchema?.required ?? []);
  const fields = Object.entries(properties);
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(fields.map(([key]) => [key, ""])),
  );

  function submit(action: ElicitationSubmit["action"]) {
    onSubmit({
      toolName,
      toolCallId,
      action,
      content: action === "accept" ? values : undefined,
    });
  }

  function onFormSubmit(event: FormEvent) {
    event.preventDefault();
    for (const key of required) {
      if (!values[key]?.trim()) return;
    }
    submit("accept");
  }

  return (
    <form
      onSubmit={onFormSubmit}
      className="mt-4 rounded-2xl border border-border bg-card p-4 shadow-composer"
    >
      <p className="text-sm font-medium text-foreground">
        {request.message ?? "Additional input required"}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{toolName}</p>

      {fields.length > 0 ? (
        <div className="mt-4 space-y-3">
          {fields.map(([key, schema]) => (
            <label key={key} className="block">
              <span className="mb-1.5 block text-xs font-medium text-foreground">
                {schema.title ?? key}
                {required.has(key) ? " *" : ""}
              </span>
              {schema.enum?.length ? (
                <select
                  value={values[key] ?? ""}
                  onChange={(e) =>
                    setValues((prev) => ({ ...prev, [key]: e.target.value }))
                  }
                  className="w-full cursor-pointer rounded-md border border-border bg-background px-3 py-2 text-sm outline-none"
                  required={required.has(key)}
                >
                  <option value="">Select…</option>
                  {schema.enum.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type={schema.type === "number" || schema.type === "integer" ? "number" : "text"}
                  value={values[key] ?? ""}
                  onChange={(e) =>
                    setValues((prev) => ({ ...prev, [key]: e.target.value }))
                  }
                  placeholder={schema.description}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none"
                  required={required.has(key)}
                />
              )}
            </label>
          ))}
        </div>
      ) : null}

      <div className="mt-4 flex gap-2">
        <button
          type="submit"
          className="cursor-pointer rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground"
        >
          Continue
        </button>
        <button
          type="button"
          className="cursor-pointer rounded-full bg-accent px-4 py-2 text-xs font-medium text-accent-foreground"
          onClick={() => submit("decline")}
        >
          Decline
        </button>
      </div>
    </form>
  );
}
