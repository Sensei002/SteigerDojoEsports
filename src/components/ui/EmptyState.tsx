import type { ReactNode } from 'react';

interface Props {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

const EmptyState = ({ icon, title, description, action }: Props) => (
  <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-brand-border bg-brand-dark/40 px-6 py-16 text-center">
    {icon && <div className="text-brand-gray">{icon}</div>}
    <h3 className="heading-display text-lg text-brand-light">{title}</h3>
    {description && <p className="max-w-sm text-sm text-brand-gray">{description}</p>}
    {action && <div className="mt-2">{action}</div>}
  </div>
);

export default EmptyState;
