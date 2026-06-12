import clsx from 'clsx';

const Spinner = ({ className }: { className?: string }) => (
  <span
    className={clsx(
      'inline-block h-8 w-8 animate-spin rounded-full border-4 border-brand-border border-t-brand-red',
      className
    )}
  />
);

export default Spinner;
