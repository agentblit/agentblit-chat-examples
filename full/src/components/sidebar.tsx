"use client";

import { PanelLeftClose, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/cn";
import type { ThreadSummary } from "@/lib/api";

type Props = {
  threads: ThreadSummary[];
  activeId: string;
  error?: string;
  onNew: () => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onCollapse: () => void;
};

export function Sidebar({
  threads,
  activeId,
  error,
  onNew,
  onSelect,
  onDelete,
  onCollapse,
}: Props) {
  return (
    <aside className="flex h-full w-60 shrink-0 flex-col overflow-hidden border-r border-border bg-muted/40">
      <div className="flex items-center justify-between gap-2 px-3 py-3">
        <p className="text-sm font-medium text-foreground">Chats</p>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={onNew}
            className="cursor-pointer rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label="New chat"
            title="New chat"
          >
            <Plus className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onCollapse}
            className="cursor-pointer rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label="Collapse sidebar"
            title="Collapse sidebar"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        {error ? (
          <p className="px-2 text-xs text-destructive">{error}</p>
        ) : null}

        {threads.length === 0 ? (
          <p className="px-2 text-xs text-muted-foreground">No chats yet</p>
        ) : (
          <ul className="space-y-0.5">
            {threads.map((thread) => {
              const active = thread.id === activeId;
              return (
                <li key={thread.id} className="group relative">
                  <button
                    type="button"
                    onClick={() => onSelect(thread.id)}
                    className={cn(
                      "w-full cursor-pointer rounded-md py-2 pr-8 pl-2.5 text-left text-sm transition-colors",
                      active
                        ? "bg-accent text-accent-foreground"
                        : "text-foreground hover:bg-accent/60",
                    )}
                  >
                    <span className="line-clamp-2">{thread.title}</span>
                  </button>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onDelete(thread.id);
                    }}
                    className={cn(
                      "absolute top-1/2 right-1 -translate-y-1/2 cursor-pointer rounded-md p-1 text-muted-foreground",
                      "opacity-0 transition-opacity group-hover:opacity-100 hover:bg-card hover:text-destructive",
                      "focus:opacity-100",
                    )}
                    aria-label={`Delete ${thread.title}`}
                    title="Delete chat"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
}
