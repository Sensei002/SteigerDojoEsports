import type { ButtonHTMLAttributes, ReactNode } from 'react';
import clsx from 'clsx';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  leftIcon?: ReactNode;
  fullWidth?: boolean;
}

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-brand-red text-white hover:bg-brand-redDark shadow-glow hover:shadow-glow disabled:shadow-none',
  secondary: 'bg-brand-panel text-brand-light border border-brand-border hover:border-brand-red/60',
  outline: 'border border-brand-border text-brand-light hover:bg-brand-panel',
  ghost: 'text-brand-light hover:bg-brand-panel',
  danger: 'bg-red-900/40 text-red-300 border border-red-800/50 hover:bg-red-900/60',
};

const SIZES: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2.5 text-sm',
  lg: 'px-6 py-3 text-base',
};

const Button = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  leftIcon,
  fullWidth,
  className,
  children,
  disabled,
  ...rest
}: Props) => (
  <button
    className={clsx(
      'inline-flex items-center justify-center gap-2 rounded-lg font-semibold uppercase tracking-wide transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50',
      VARIANTS[variant],
      SIZES[size],
      fullWidth && 'w-full',
      className
    )}
    disabled={disabled || loading}
    {...rest}
  >
    {loading && (
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
    )}
    {!loading && leftIcon}
    {children}
  </button>
);

export default Button;
