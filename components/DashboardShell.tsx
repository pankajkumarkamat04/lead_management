'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { captureError } from '@/components/FormError';
import { apiFetch } from '@/lib/client';
import { Icon, type IconName } from './icons';
import type { UserDTO } from '@/lib/types';

interface NavItem {
  href: string;
  label: string;
  icon: IconName;
  adminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Overview', icon: 'overview' },
  { href: '/dashboard/leads', label: 'Leads', icon: 'leads' },
  { href: '/dashboard/mail', label: 'Mail', icon: 'mail' },
  { href: '/dashboard/sites', label: 'Websites', icon: 'sites', adminOnly: true },
  { href: '/dashboard/users', label: 'Team', icon: 'team', adminOnly: true },
  { href: '/dashboard/integration', label: 'Integration', icon: 'code' },
];

function isActive(pathname: string, href: string): boolean {
  // `/dashboard` would otherwise light up for every child route.
  return href === '/dashboard' ? pathname === href : pathname.startsWith(href);
}

export function DashboardShell({
  user,
  children,
}: {
  user: UserDTO;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);

  // Navigating on mobile should dismiss the drawer.
  useEffect(() => setMenuOpen(false), [pathname]);

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.adminOnly || user.role === 'admin',
  );

  async function signOut() {
    setSigningOut(true);
    setSignOutError(null);
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
      router.replace('/login');
      router.refresh();
    } catch (caught) {
      setSignOutError(captureError(caught));
      setSigningOut(false);
    }
  }

  const nav = (
    <nav className="flex-1 space-y-1 px-3">
      {visibleItems.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              active
                ? 'bg-brand-600 text-white'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Icon name={item.icon} className="size-[18px] shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  const sidebarBody = (
    <>
      <div className="flex items-center gap-2.5 px-5 py-5">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-600 text-sm font-bold text-white">
          LD
        </span>
        <span className="text-base font-semibold tracking-tight text-white">
          Lead Desk
        </span>
      </div>

      {nav}

      <div className="border-t border-slate-800 p-3">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-slate-700 text-xs font-semibold uppercase text-white">
            {user.name.slice(0, 2)}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-white">
              {user.name}
            </span>
            <span className="block text-xs capitalize text-slate-400">
              {user.role}
            </span>
          </span>
        </div>

        <button
          type="button"
          onClick={signOut}
          disabled={signingOut}
          className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800 hover:text-white disabled:opacity-60"
        >
          <Icon name="logout" className="size-[18px]" />
          {signingOut ? 'Signing out…' : 'Sign out'}
        </button>
        {signOutError && (
          <p className="mt-2 px-3 text-xs text-rose-400">{signOutError}</p>
        )}
      </div>
    </>
  );

  return (
    <div className="min-h-dvh lg:flex">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col bg-slate-900 lg:flex">
        {sidebarBody}
      </aside>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
            className="absolute inset-0 cursor-default bg-slate-900/50"
          />
          <aside className="relative flex h-full w-72 max-w-[85vw] flex-col bg-slate-900">
            {sidebarBody}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur lg:hidden">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
          >
            <Icon name="menu" className="size-5" />
          </button>
          <span className="flex items-center gap-2">
            <span className="grid size-7 place-items-center rounded-md bg-brand-600 text-xs font-bold text-white">
              LD
            </span>
            <span className="text-sm font-semibold text-slate-900">
              Lead Desk
            </span>
          </span>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
