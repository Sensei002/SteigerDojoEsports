import type { ReactNode } from 'react';

interface Props {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  icon?: ReactNode;
}

/** Consistent section / page heading with optional action on the right. */
const SectionHeader = ({ title, subtitle, action, icon }: Props) => (
  <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
    <div>
      <h2 className="heading-display flex items-center gap-2 text-2xl text-white">
        {icon && <span className="text-brand-red">{icon}</span>}
        <span className="border-l-4 border-brand-red pl-3">{title}</span>
      </h2>
      {subtitle && <p className="mt-1 text-sm text-brand-gray">{subtitle}</p>}
    </div>
    {action}
  </div>
);

export default SectionHeader;
