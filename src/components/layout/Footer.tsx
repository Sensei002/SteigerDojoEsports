import { Link } from 'react-router-dom';
import { FaDiscord, FaTwitter, FaTwitch, FaYoutube, FaInstagram } from 'react-icons/fa';
import { FiMail } from 'react-icons/fi';
import Logo from '@/components/ui/Logo';
import { GAMES, BRAND_NAME } from '@/utils/constants';

const SOCIALS = [
  { icon: FaDiscord, href: 'https://discord.gg', label: 'Discord' },
  { icon: FaTwitter, href: 'https://twitter.com', label: 'Twitter' },
  { icon: FaTwitch, href: 'https://twitch.tv', label: 'Twitch' },
  { icon: FaYoutube, href: 'https://youtube.com', label: 'YouTube' },
  { icon: FaInstagram, href: 'https://instagram.com', label: 'Instagram' },
];

const Footer = () => (
  <footer className="mt-20 border-t border-brand-border bg-brand-dark">
    <div className="container-app grid grid-cols-1 gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4">
      <div>
        <Logo />
        <p className="mt-4 max-w-xs text-sm text-brand-gray">
          The competitive home for esports tournaments. Create, compete, and climb the ranks
          across your favorite titles.
        </p>
        <div className="mt-5 flex gap-3">
          {SOCIALS.map((s) => (
            <a
              key={s.label}
              href={s.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={s.label}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-brand-border text-brand-gray transition-colors hover:border-brand-red hover:text-brand-red"
            >
              <s.icon size={16} />
            </a>
          ))}
        </div>
      </div>

      <div>
        <h4 className="heading-display mb-4 text-sm text-white">Platform</h4>
        <ul className="space-y-2 text-sm">
          <li><Link to="/tournaments" className="link-muted">Tournaments</Link></li>
          <li><Link to="/teams" className="link-muted">Teams</Link></li>
          <li><Link to="/news" className="link-muted">News</Link></li>
          <li><Link to="/register" className="link-muted">Create Account</Link></li>
        </ul>
      </div>

      <div>
        <h4 className="heading-display mb-4 text-sm text-white">Games</h4>
        <ul className="space-y-2 text-sm">
          {GAMES.slice(0, 6).map((g) => (
            <li key={g.id}>
              <Link to={`/tournaments?game=${g.id}`} className="link-muted">{g.name}</Link>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h4 className="heading-display mb-4 text-sm text-white">Contact</h4>
        <ul className="space-y-3 text-sm text-brand-gray">
          <li className="flex items-center gap-2">
            <FiMail size={15} /> support@steigerdojo.gg
          </li>
          <li>
            <a href="https://discord.gg" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-lg bg-[#5865F2]/15 px-3 py-2 text-[#7d88f5] transition-colors hover:bg-[#5865F2]/25">
              <FaDiscord size={16} /> Join our Discord
            </a>
          </li>
        </ul>
      </div>
    </div>

    <div className="border-t border-brand-border">
      <div className="container-app flex flex-col items-center justify-between gap-2 py-5 text-xs text-brand-gray sm:flex-row">
        <p>© {new Date().getFullYear()} {BRAND_NAME}. All rights reserved.</p>
        <div className="flex gap-4">
          <a href="#" className="link-muted">Privacy</a>
          <a href="#" className="link-muted">Terms</a>
          <a href="#" className="link-muted">Cookies</a>
        </div>
      </div>
    </div>
  </footer>
);

export default Footer;
