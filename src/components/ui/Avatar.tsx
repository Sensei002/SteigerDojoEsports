import clsx from 'clsx';
import { initials, colorFromString } from '@/utils/helpers';

interface Props {
  src?: string;
  name?: string;
  size?: number;
  className?: string;
  square?: boolean;
}

/** Avatar with image, falling back to initials on a deterministic color. */
const Avatar = ({ src, name = '', size = 40, className, square }: Props) => {
  const dim = { width: size, height: size, fontSize: size * 0.4 };
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        style={dim}
        className={clsx(
          'object-cover border border-brand-border',
          square ? 'rounded-lg' : 'rounded-full',
          className
        )}
      />
    );
  }
  return (
    <div
      style={{ ...dim, backgroundColor: colorFromString(name || 'x') }}
      className={clsx(
        'flex items-center justify-center font-semibold text-white border border-white/10',
        square ? 'rounded-lg' : 'rounded-full',
        className
      )}
    >
      {initials(name)}
    </div>
  );
};

export default Avatar;
