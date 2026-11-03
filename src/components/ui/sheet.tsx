"use client";

import type { ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export function Sheet({ children, open, onOpenChange }: { children: ReactNode; open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      {children}
    </Dialog.Root>
  );
}

export function SheetContent({ children, title }: { children: ReactNode; title: string }) {
  return (
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-900/40" />
      <Dialog.Content className={cn("fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-auto rounded-t-2xl bg-white p-5 shadow-xl sm:inset-y-0 sm:right-0 sm:left-auto sm:w-[28rem] sm:rounded-none")}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <Dialog.Title className="text-xl font-semibold text-slate-900">{title}</Dialog.Title>
          <Dialog.Close className="rounded-full p-2 text-slate-700 hover:bg-slate-100" aria-label="Close">
            <X className="size-5" />
          </Dialog.Close>
        </div>
        {children}
      </Dialog.Content>
    </Dialog.Portal>
  );
}
