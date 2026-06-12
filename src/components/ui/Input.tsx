import { forwardRef, type InputHTMLAttributes } from 'react';
import clsx from 'clsx';

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, Props>(
  ({ label, error, className, id, ...rest }, ref) => (
    <div className="w-full">
      {label && (
        <label htmlFor={id} className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-brand-gray">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={id}
        className={clsx('input-base', error && 'border-brand-red focus:ring-brand-red', className)}
        {...rest}
      />
      {error && <p className="mt-1 text-xs text-brand-red">{error}</p>}
    </div>
  )
);

Input.displayName = 'Input';
export default Input;
