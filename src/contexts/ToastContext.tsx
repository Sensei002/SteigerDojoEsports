import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import {
  FiCheckCircle,
  FiAlertCircle,
  FiInfo,
  FiXCircle,
  FiX,
} from 'react-icons/fi';
import clsx from 'clsx';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const ICONS = {
  success: FiCheckCircle,
  error: FiXCircle,
  info: FiInfo,
  warning: FiAlertCircle,
};

const STYLES: Record<ToastType, string> = {
  success: 'border-emerald-500/40 text-emerald-300',
  error: 'border-brand-red/50 text-brand-redGlow',
  info: 'border-blue-500/40 text-blue-300',
  warning: 'border-amber-500/40 text-amber-300',
};

let counter = 0;

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, type: ToastType = 'info') => {
      const id = ++counter;
      setToasts((t) => [...t, { id, type, message }]);
      setTimeout(() => remove(id), 4000);
    },
    [remove]
  );

  const value: ToastContextValue = {
    toast,
    success: (m) => toast(m, 'success'),
    error: (m) => toast(m, 'error'),
    info: (m) => toast(m, 'info'),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-80 max-w-[calc(100vw-2rem)]">
        {toasts.map((t) => {
          const Icon = ICONS[t.type];
          return (
            <div
              key={t.id}
              className={clsx(
                'flex items-start gap-3 rounded-lg bg-brand-panel border px-4 py-3 shadow-card animate-slide-in',
                STYLES[t.type]
              )}
            >
              <Icon className="mt-0.5 shrink-0" size={18} />
              <p className="flex-1 text-sm text-brand-light">{t.message}</p>
              <button onClick={() => remove(t.id)} className="text-brand-gray hover:text-white">
                <FiX size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useToast = (): ToastContextValue => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
};
