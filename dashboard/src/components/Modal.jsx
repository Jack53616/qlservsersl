import { X } from 'lucide-react';

export default function Modal({ open, title, onClose, children, footer }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 animate-fade-up" onClick={onClose} />
      <div className="relative w-full max-w-md glass rounded-2xl p-5 shadow-2xl animate-fade-up">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-ql-text-dim">
            <X size={18} />
          </button>
        </div>
        <div className="space-y-4">{children}</div>
        {footer && <div className="mt-5 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}
