import clsx from 'clsx';

interface Props {
  className?: string;
}

/** Shimmering loading skeleton block. */
const Skeleton = ({ className }: Props) => (
  <div
    className={clsx(
      'relative overflow-hidden rounded-md bg-brand-panel',
      'before:absolute before:inset-0 before:-translate-x-full before:animate-shimmer',
      'before:bg-gradient-to-r before:from-transparent before:via-white/5 before:to-transparent',
      className
    )}
  />
);

export const CardSkeleton = () => (
  <div className="card-surface p-4">
    <Skeleton className="mb-3 h-32 w-full" />
    <Skeleton className="mb-2 h-4 w-3/4" />
    <Skeleton className="h-3 w-1/2" />
  </div>
);

export const ListSkeleton = ({ count = 4 }: { count?: number }) => (
  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
    {Array.from({ length: count }).map((_, i) => (
      <CardSkeleton key={i} />
    ))}
  </div>
);

export default Skeleton;
