"use client";

// Classic JSX runtime for `node --import tsx --test`. Next compiles this with the automatic runtime.
import React, { useId, type KeyboardEvent } from "react";
import { MAX_CHAT_MESSAGE } from "@/lib/chat/ui";

export function ChatComposer({
  value,
  pending,
  sendLocked,
  onChange,
  onSend,
  onCancel,
}: {
  value: string;
  pending: boolean;
  sendLocked: boolean;
  onChange: (value: string) => void;
  onSend: () => void;
  onCancel: () => void;
}) {
  const counterId = useId();
  const nearLimit = value.length >= 1_800;
  const canSend = value.trim().length > 0 && !pending && !sendLocked;

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey) return;
    event.preventDefault();
    if (canSend) onSend();
  }

  return (
    <form
      className="border-t border-line px-4 py-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (canSend) onSend();
      }}
    >
      <div className="flex items-end gap-2">
        <textarea
          rows={1}
          value={value}
          maxLength={MAX_CHAT_MESSAGE}
          aria-label="Ask about races or candidates"
          aria-describedby={nearLimit ? counterId : undefined}
          placeholder="Ask a factual question…"
          disabled={pending}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={onKeyDown}
          className="max-h-32 min-h-11 flex-1 resize-none rounded-lg border border-line bg-card px-3 py-2 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60"
        />
        {pending ? (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-line px-3 py-2 text-sm font-semibold text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Cancel
          </button>
        ) : (
          <button
            type="submit"
            disabled={!canSend}
            className="rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-45"
          >
            Send
          </button>
        )}
      </div>
      {nearLimit ? (
        <p id={counterId} className="mt-1 text-xs text-muted">
          {value.length.toLocaleString("en-US")} / {MAX_CHAT_MESSAGE.toLocaleString("en-US")}
        </p>
      ) : null}
      <p className="mt-2 text-xs leading-5 text-muted">
        Answers cite stored public filings. Candate does not rank candidates or give voting advice.
      </p>
    </form>
  );
}
