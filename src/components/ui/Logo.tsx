import { BRAND_NAME } from '@/utils/constants';
import { useState } from 'react';
import clsx from 'clsx';

// Resolve against Vite's base URL so it works on GitHub Pages sub-paths.
const LOGO_SRC = `${import.meta.env.BASE_URL}assets/logo.png`;

interface Props {
  size?: number;
  showText?: boolean;
  className?: string;
}

/**
 * Brand logo. Tries /assets/logo.png (provided later) and falls back to a
 * styled monogram placeholder so the app renders before the asset exists.
 */
const Logo = ({ size = 36, showText = true, className }: Props) => {
  const [failed, setFailed] = useState(false);

  return (
    <span className={clsx('inline-flex items-center gap-2.5', className)}>
      {failed ? (
        <span
          style={{ width: size, height: size }}
          className="flex items-center justify-center rounded-lg bg-gradient-to-br from-brand-red to-brand-redDark font-display font-bold text-white shadow-glow"
        >
          SD
        </span>
      ) : (
        <img
          src={LOGO_SRC}
          alt={BRAND_NAME}
          style={{ width: size, height: size }}
          className="rounded-lg object-contain"
          onError={() => setFailed(true)}
        />
      )}
      {showText && (
        <span className="heading-display text-lg font-bold leading-none text-white">
          Steiger<span className="text-brand-red">Dojo</span>
          <span className="block text-[10px] font-medium tracking-[0.3em] text-brand-gray">
            ESPORTS
          </span>
        </span>
      )}
    </span>
  );
};

export default Logo;
