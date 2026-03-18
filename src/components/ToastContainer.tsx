import { useToastStore, ToastType } from "../lib/toastStore";
import { X } from "lucide-react";

export default function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  const getBgColor = (type: ToastType) => {
    switch (type) {
      case "success": return "bg-[var(--accent-moss)] text-white";
      case "error": return "bg-[var(--accent-ember)] text-white";
      case "warning": return "bg-[var(--accent-gold)] text-[#1a1510]";
      case "info":
      default: return "bg-[var(--bg-elevated)] border border-[var(--border-default)] text-[var(--text-primary)]";
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`relative px-4 py-3 rounded-lg shadow-lg flex items-center justify-between min-w-[300px] max-w-md ${getBgColor(toast.type)}`}
          role="alert"
        >
          <p className="text-sm font-medium mr-4">{toast.message}</p>
          <button
            onClick={() => removeToast(toast.id)}
            className="text-current opacity-70 hover:opacity-100 transition-opacity"
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
