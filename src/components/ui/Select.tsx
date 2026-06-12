import type { SelectHTMLAttributes } from 'react';
import clsx from 'clsx';

interface Option {
  value: string;
  label: string;
}

interface Props extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: Option[];
  error?: string;
}

const Select = ({ label, options, error, className, id, ...rest }: Props) => (
  <div className="w-full">
    {label && (
      <label htmlFor={id} className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-brand-gray">
        {label}
      </label>
    )}
    <select id={id} className={clsx('input-base', error && 'border-brand-red', className)} {...rest}>
      {options.map((o) => (
        <option key={o.value} value={o.value} className="bg-brand-dark">
          {o.label}
        </option>
      ))}
    </select>
    {error && <p className="mt-1 text-xs text-brand-red">{error}</p>}
  </div>
);

export default Select;
