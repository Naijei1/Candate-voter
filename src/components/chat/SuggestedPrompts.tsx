// Classic JSX runtime for `node --import tsx --test`. Next compiles this with the automatic runtime.
import React from "react";

export function SuggestedPrompts({
  prompts,
  disabled,
  onPick,
}: {
  prompts: string[];
  disabled?: boolean;
  onPick: (prompt: string) => void;
}) {
  if (prompts.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Suggested prompts">
      {prompts.map((prompt) => (
        <button
          key={prompt}
          type="button"
          disabled={disabled}
          onClick={() => onPick(prompt)}
          className="rounded-full border border-line bg-card px-3 py-1.5 text-left text-sm text-ink hover:bg-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50"
        >
          {prompt}
        </button>
      ))}
    </div>
  );
}
