import type { ReactNode } from 'react';
import clsx from 'clsx';

interface Props {
  children: ReactNode;
  className?: string;
}

/** Small inline pill. Pass color classes via className for variants. */
const Badge = ({ children, className }: Props) => (
  <span
    className={clsx(
      'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide',
      className ?? 'bg-brand-border/60 text-brand-light'
    )}
  >
    {children}
  </span>
);

export default Badge;
