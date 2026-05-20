import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

const ICON = { success: CheckCircle, error: XCircle, info: Info };
const COLOR = {
  success: 'border-teal-500/40 bg-teal-500/10 text-teal-300',
  error: 'border-coral/40 bg-coral/10 text-coral',
  info: 'border-blue-500/40 bg-blue-500/10 text-blue-300',
};

function ToastItem({ item, onRemove }: { item: ToastItem; onRemove: (id: string) => void }) {
  const Icon = ICON[item.type];

  useEffect(() => {
    const t = setTimeout(() => onRemove(item.id), 4000);
    return () => clearTimeout(t);
  }, [item.id, onRemove]);

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-sm shadow-lg ${COLOR[item.type]}`}
    >
      <Icon size={16} className="shrink-0" />
      <p className="text-sm">{item.message}</p>
      <button onClick={() => onRemove(item.id)} className="ml-auto shrink-0 opacity-70 hover:opacity-100">
        <X size={14} />
      </button>
    </div>
  );
}

let _push: ((item: Omit<ToastItem, 'id'>) => void) | null = null;
export const toast = {
  success: (message: string) => _push?.({ message, type: 'success' }),
  error: (message: string) => _push?.({ message, type: 'error' }),
  info: (message: string) => _push?.({ message, type: 'info' }),
};

export function ToastContainer() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    _push = (item) =>
      setItems((prev) => [...prev, { ...item, id: crypto.randomUUID() }]);
    return () => { _push = null; };
  }, []);

  const remove = (id: string) => setItems((prev) => prev.filter((i) => i.id !== id));

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 w-80">
      {items.map((item) => (
        <ToastItem key={item.id} item={item} onRemove={remove} />
      ))}
    </div>
  );
}
