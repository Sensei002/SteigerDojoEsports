import type { TextareaHTMLAttributes } from 'react';
import clsx from 'clsx';

interface Props extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

const Textarea = ({ label, error, className, id, ...rest }: Props) => (
  <div className="w-full">
    {label && (
      <label htmlFor={id} className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-brand-gray">
        {label}
      </label>
    )}
    <textarea
      id={id}
      rows={4}
      className={clsx('input-base resize-y', error && 'border-brand-red', className)}
      {...rest}
    />
    {error && <p className="mt-1 text-xs text-brand-red">{error}</p>}
  </div>
);

export default Textarea;
