import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { FiX } from 'react-icons/fi';
import clsx from 'clsx';

interface Props {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  footer?: ReactNode;
}

const SIZES = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl' };

const Modal = ({ open, onClose, title, children, size = 'md', footer }: Props) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    if (open) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div
        className={clsx(
          'relative z-10 w-full card-surface shadow-card animate-fade-in',
          SIZES[size]
        )}
      >
        <div className="flex items-center justify-between border-b border-brand-border px-5 py-4">
          <h2 className="heading-display text-lg text-white">{title}</h2>
          <button onClick={onClose} className="text-brand-gray hover:text-white transition-colors">
            <FiX size={20} />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-5 py-5">{children}</div>
        {footer && (
          <div className="flex justify-end gap-3 border-t border-brand-border px-5 py-4">{footer}</div>
        )}
      </div>
    </div>,
    document.body
  );
};

export default Modal;
