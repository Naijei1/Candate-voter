"use client";

import { usePathname, useSearchParams } from "next/navigation";
import {
  createContext,
  Suspense,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { ChatShell } from "@/components/chat/ChatShell";
import { useChat, type ChatController } from "@/components/chat/useChat";
import { contextFromLocation, isAskPanelPath, type ChatContextInput } from "@/lib/chat/ui";

type AskContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  triggerRef: RefObject<HTMLButtonElement | null>;
  chat: ChatController;
  cycles: number[];
  pageContext: ChatContextInput | null;
  replacePageContext: (context: ChatContextInput) => () => void;
};

const AskContext = createContext<AskContextValue | null>(null);

export function useAsk(): AskContextValue {
  const value = useContext(AskContext);
  if (!value) throw new Error("Ask controls must render inside AskProvider");
  return value;
}

export function AskProvider({ cycles, children }: { cycles: number[]; children: ReactNode }) {
  const chat = useChat();
  const [open, setOpen] = useState(false);
  const [pageContext, setPageContext] = useState<ChatContextInput | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const generation = useRef(0);
  const pathname = usePathname();
  const replacePageContext = useCallback((next: ChatContextInput) => {
    const id = ++generation.current;
    setPageContext(next);
    return () => {
      if (generation.current === id) setPageContext(null);
    };
  }, []);

  useEffect(() => {
    if (!isAskPanelPath(pathname)) setOpen(false);
  }, [pathname]);

  return (
    <AskContext.Provider value={{ open, setOpen, triggerRef, chat, cycles, pageContext, replacePageContext }}>
      {children}
      <Suspense fallback={null}>
        <AskPanel cycles={cycles} />
      </Suspense>
    </AskContext.Provider>
  );
}

/** Race, candidate, and state pages publish ids the Ask request should send. */
export function AskPageContext(context: ChatContextInput) {
  const { replacePageContext } = useAsk();
  const { raceId, candidateId, cycle, messagePrefix, label } = context;
  useEffect(() => {
    return replacePageContext({
      ...(raceId ? { raceId } : {}),
      ...(candidateId ? { candidateId } : {}),
      ...(cycle != null ? { cycle } : {}),
      ...(messagePrefix ? { messagePrefix } : {}),
      ...(label ? { label } : {}),
    });
  }, [replacePageContext, raceId, candidateId, cycle, messagePrefix, label]);
  return null;
}

function AskPanel({ cycles }: { cycles: number[] }) {
  const { open, setOpen, triggerRef, chat, pageContext } = useAsk();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const located = contextFromLocation({ pathname, searchParams, cycles });
  const context = mergePageContext(located, pageContext);
  const panelRef = useRef<HTMLDivElement>(null);
  const [keyboardInset, setKeyboardInset] = useState(0);
  const close = useCallback(() => setOpen(false), [setOpen]);

  useFocusTrap(open && located.panel, panelRef, close, triggerRef);
  useScrollLock(open && located.panel);
  useKeyboardInset(open && located.panel, setKeyboardInset);

  if (!open || !located.panel) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 top-16 z-40">
      <button
        type="button"
        aria-label="Close ask panel"
        onClick={close}
        className="absolute inset-0 hidden bg-ink/10 md:right-[400px] md:block"
      />
      <div
        id="ask-panel"
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ask-panel-title"
        style={keyboardInset > 0 ? { paddingBottom: keyboardInset } : undefined}
        className="absolute inset-0 flex min-h-0 flex-col border-t border-line bg-card shadow-xl md:left-auto md:w-[400px] md:border-t-0 md:border-l"
      >
        <ChatShell mode="panel" context={context} chat={chat} onClose={close} />
      </div>
    </div>
  );
}

function mergePageContext(
  located: ChatContextInput,
  page: ChatContextInput | null,
): ChatContextInput {
  if (!page) return located;
  return {
    cycle: page.cycle ?? located.cycle,
    ...(page.raceId || located.raceId ? { raceId: page.raceId ?? located.raceId } : {}),
    ...(page.candidateId || located.candidateId
      ? { candidateId: page.candidateId ?? located.candidateId }
      : {}),
    ...(page.messagePrefix || located.messagePrefix
      ? { messagePrefix: page.messagePrefix ?? located.messagePrefix }
      : {}),
    ...(page.label || located.label ? { label: page.label ?? located.label } : {}),
  };
}

function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const media = window.matchMedia("(max-width: 767px)");
    const apply = () => {
      document.body.style.overflow = media.matches ? "hidden" : "";
    };
    apply();
    media.addEventListener("change", apply);
    return () => {
      media.removeEventListener("change", apply);
      document.body.style.overflow = "";
    };
  }, [active]);
}

function useKeyboardInset(active: boolean, setInset: (value: number) => void) {
  useEffect(() => {
    if (!active) return;
    const viewport = window.visualViewport;
    if (!viewport) return;
    const update = () => {
      const overlap = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
      setInset(overlap);
    };
    update();
    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);
    return () => {
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
      setInset(0);
    };
  }, [active, setInset]);
}

function useFocusTrap(
  active: boolean,
  containerRef: RefObject<HTMLElement | null>,
  onClose: () => void,
  triggerRef: RefObject<HTMLButtonElement | null>,
) {
  useEffect(() => {
    if (!active) return;
    const root = containerRef.current;
    if (!root) return;
    const previous = document.activeElement;
    const focusable = () =>
      [...root.querySelectorAll<HTMLElement>("a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled])")].filter(
        (element) => !element.hasAttribute("disabled"),
      );

    const field = root.querySelector("textarea");
    if (field instanceof HTMLElement) field.focus();
    else focusable()[0]?.focus();

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const items = focusable();
      const first = items[0];
      const last = items[items.length - 1];
      if (!first || !last) {
        event.preventDefault();
        return;
      }
      const current = document.activeElement;
      if (event.shiftKey && (current === first || !root?.contains(current))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (current === last || !root?.contains(current))) {
        event.preventDefault();
        first.focus();
      }
    }

    const trigger = triggerRef.current;
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      if (trigger) trigger.focus();
      else if (previous instanceof HTMLElement) previous.focus();
    };
  }, [active, containerRef, onClose, triggerRef]);
}
