import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { Notice } from "./ui";

interface Toast {
  id: number;
  kind: "success" | "error";
  text: string;
}

const ToastContext = createContext<(kind: Toast["kind"], text: string) => void>(() => {});

let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const push = useCallback(
    (kind: Toast["kind"], text: string) => {
      const id = nextId++;
      setToasts((t) => [...t.slice(-3), { id, kind, text }]);
      window.setTimeout(() => dismiss(id), kind === "error" ? 8000 : 4000);
    },
    [dismiss],
  );
  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed bottom-20 right-4 z-[60] flex w-[min(380px,calc(100vw-2rem))] flex-col gap-2 lg:bottom-4">
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto rounded-lg bg-surface shadow-pop">
            <Notice kind={t.kind} onClose={() => dismiss(t.id)}>
              {t.text}
            </Notice>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
