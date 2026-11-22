import React from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { useApp } from '../hooks/useAppContext';

export function ToastContainer() {
  const { toasts, dismissToast } = useApp();
  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-[calc(100vw-2.5rem)]"
      aria-live="polite"
    >
      {toasts.map((toast) => {
        const styles =
          toast.type === 'success'
            ? 'bg-[#168B4B] text-white border-[#11713C]'
            : toast.type === 'error'
              ? 'bg-[#E34C3D] text-white border-[#C93B2D]'
              : 'bg-[#26352E] text-white border-[#1B2822]';
        const Icon =
          toast.type === 'success'
            ? CheckCircle2
            : toast.type === 'error'
              ? AlertCircle
              : Info;
        return (
          <div
            key={toast.id}
            className={`flex items-start gap-2.5 px-4 py-3 rounded-xl border shadow-lg text-sm font-medium ${styles}`}
          >
            <Icon className="w-4 h-4 mt-0.5 shrink-0" />
            <span className="flex-1 leading-snug">{toast.text}</span>
            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              className="opacity-80 hover:opacity-100 p-0.5"
              aria-label="Dismiss notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
