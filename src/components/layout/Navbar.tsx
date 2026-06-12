import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  FiMenu,
  FiX,
  FiBell,
  FiSearch,
  FiUser,
  FiLogOut,
  FiGrid,
  FiChevronDown,
} from 'react-icons/fi';
import clsx from 'clsx';
import Logo from '@/components/ui/Logo';
import Avatar from '@/components/ui/Avatar';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useNotifications } from '@/hooks/useNotifications';
import { logout } from '@/services/authService';
import { ROLE_LABEL } from '@/utils/constants';
import { fromNow } from '@/utils/helpers';

const NAV_LINKS = [
  { to: '/tournaments', label: 'Tournaments' },
  { to: '/teams', label: 'Teams' },
  { to: '/news', label: 'News' },
  { to: '/games/r6', label: 'R6' },
  { to: '/games/valorant', label: 'Valorant' },
];

const Navbar = () => {
  const { user, isAuthenticated, isStaff } = useAuth();
  const { success } = useToast();
  const { notifications, unreadCount, markAllRead } = useNotifications();
  const navigate = useNavigate();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [search, setSearch] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
        setBellOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const handleLogout = async () => {
    await logout();
    success('Signed out.');
    navigate('/');
  };

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) navigate(`/search?q=${encodeURIComponent(search.trim())}`);
  };

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    clsx(
      'text-sm font-medium uppercase tracking-wide transition-colors',
      isActive ? 'text-brand-red' : 'text-brand-gray hover:text-brand-light'
    );

  return (
    <header className="sticky top-0 z-50 border-b border-brand-border bg-brand-black/80 backdrop-blur-lg">
      <div className="container-app flex h-16 items-center justify-between gap-4">
        <div className="flex items-center gap-8">
          <Link to="/" className="shrink-0">
            <Logo />
          </Link>
          <nav className="hidden items-center gap-6 lg:flex">
            {NAV_LINKS.map((l) => (
              <NavLink key={l.to} to={l.to} className={linkClass}>
                {l.label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <form onSubmit={onSearch} className="hidden md:block">
            <div className="relative">
              <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-brand-gray" size={15} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search…"
                className="w-44 rounded-lg border border-brand-border bg-brand-dark py-2 pl-9 pr-3 text-sm text-brand-light placeholder:text-brand-gray focus:w-56 focus:outline-none focus:ring-2 focus:ring-brand-red/50 transition-all"
              />
            </div>
          </form>

          {isAuthenticated ? (
            <div className="flex items-center gap-2" ref={menuRef}>
              {/* Notifications */}
              <div className="relative">
                <button
                  onClick={() => { setBellOpen((v) => !v); setMenuOpen(false); }}
                  className="relative rounded-lg p-2 text-brand-gray hover:bg-brand-panel hover:text-white"
                >
                  <FiBell size={18} />
                  {unreadCount > 0 && (
                    <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-red px-1 text-[10px] font-bold text-white">
                      {unreadCount}
                    </span>
                  )}
                </button>
                {bellOpen && (
                  <div className="absolute right-0 mt-2 w-80 card-surface p-0 animate-fade-in">
                    <div className="flex items-center justify-between border-b border-brand-border px-4 py-3">
                      <span className="heading-display text-sm">Notifications</span>
                      {unreadCount > 0 && (
                        <button onClick={() => markAllRead()} className="text-xs text-brand-red hover:underline">
                          Mark all read
                        </button>
                      )}
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <p className="px-4 py-6 text-center text-sm text-brand-gray">No notifications yet.</p>
                      ) : (
                        notifications.map((n) => (
                          <div
                            key={n.id}
                            className={clsx(
                              'border-b border-brand-border/50 px-4 py-3',
                              !n.read && 'bg-brand-red/5'
                            )}
                          >
                            <p className="text-sm font-medium text-brand-light">{n.title}</p>
                            <p className="text-xs text-brand-gray">{n.message}</p>
                            <p className="mt-1 text-[10px] text-brand-gray/70">{fromNow(n.createdAt)}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* User menu */}
              <div className="relative">
                <button
                  onClick={() => { setMenuOpen((v) => !v); setBellOpen(false); }}
                  className="flex items-center gap-2 rounded-lg p-1 pr-2 hover:bg-brand-panel"
                >
                  <Avatar src={user?.avatarUrl} name={user?.username} size={32} />
                  <FiChevronDown className="text-brand-gray" size={14} />
                </button>
                {menuOpen && (
                  <div className="absolute right-0 mt-2 w-56 card-surface p-0 animate-fade-in">
                    <div className="border-b border-brand-border px-4 py-3">
                      <p className="truncate text-sm font-semibold text-white">{user?.username}</p>
                      <p className="text-xs text-brand-red">{user && ROLE_LABEL[user.role]}</p>
                    </div>
                    <div className="py-1">
                      <Link to={`/profile/${user?.uid}`} onClick={() => setMenuOpen(false)} className="flex items-center gap-2 px-4 py-2 text-sm text-brand-light hover:bg-brand-panel">
                        <FiUser size={15} /> My Profile
                      </Link>
                      {isStaff && (
                        <Link to="/admin" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 px-4 py-2 text-sm text-brand-light hover:bg-brand-panel">
                          <FiGrid size={15} /> Dashboard
                        </Link>
                      )}
                      <button onClick={handleLogout} className="flex w-full items-center gap-2 px-4 py-2 text-sm text-brand-red hover:bg-brand-panel">
                        <FiLogOut size={15} /> Sign out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="hidden items-center gap-2 sm:flex">
              <Link to="/login" className="rounded-lg px-4 py-2 text-sm font-semibold text-brand-light hover:bg-brand-panel">
                Login
              </Link>
              <Link to="/register" className="rounded-lg bg-brand-red px-4 py-2 text-sm font-semibold text-white shadow-glow hover:bg-brand-redDark">
                Sign Up
              </Link>
            </div>
          )}

          <button onClick={() => setMobileOpen((v) => !v)} className="rounded-lg p-2 text-brand-light lg:hidden">
            {mobileOpen ? <FiX size={22} /> : <FiMenu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t border-brand-border bg-brand-dark lg:hidden">
          <nav className="container-app flex flex-col gap-1 py-3">
            {NAV_LINKS.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  clsx('rounded-lg px-3 py-2.5 text-sm font-medium', isActive ? 'bg-brand-red/10 text-brand-red' : 'text-brand-light hover:bg-brand-panel')
                }
              >
                {l.label}
              </NavLink>
            ))}
            {!isAuthenticated && (
              <div className="mt-2 flex gap-2">
                <Link to="/login" onClick={() => setMobileOpen(false)} className="flex-1 rounded-lg border border-brand-border py-2.5 text-center text-sm font-semibold">
                  Login
                </Link>
                <Link to="/register" onClick={() => setMobileOpen(false)} className="flex-1 rounded-lg bg-brand-red py-2.5 text-center text-sm font-semibold text-white">
                  Sign Up
                </Link>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  );
};

export default Navbar;
