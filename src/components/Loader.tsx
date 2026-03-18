export default function Loader({ className = "" }: { className?: string }) {
  return (
    <div className={`relative overflow-hidden bg-[var(--bg-surface)] rounded-md ${className}`}>
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-[var(--bg-elevated)] to-transparent" />
      <style>{`
        @keyframes shimmer {
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>
    </div>
  );
}
