import type { HTMLAttributes, ReactNode } from 'react';
import clsx from 'clsx';

interface Props extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  hover?: boolean;
  padding?: boolean;
}

const Card = ({ children, hover, padding = true, className, ...rest }: Props) => (
  <div
    className={clsx(
      'card-surface shadow-card',
      padding && 'p-5',
      hover &&
        'transition-all duration-200 hover:border-brand-red/50 hover:shadow-glow cursor-pointer',
      className
    )}
    {...rest}
  >
    {children}
  </div>
);

export default Card;
