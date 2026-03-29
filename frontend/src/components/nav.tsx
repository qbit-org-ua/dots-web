'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';

const navLinks = [
  { href: '/contests', label: 'Contests' },
];

export function Nav() {
  const { user, isLoading, logout } = useAuth();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  return (
    <header className="bg-slate-800 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-8">
            <Link href="/" className="text-xl font-bold tracking-tight text-blue-400 hover:text-blue-300">
              DOTS
            </Link>
            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    'px-3 py-2 rounded-md text-sm font-medium transition-colors',
                    pathname.startsWith(link.href)
                      ? 'bg-slate-700 text-white'
                      : 'text-gray-300 hover:bg-slate-700 hover:text-white'
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="hidden md:flex items-center gap-3">
            {isLoading ? (
              <div className="w-20 h-5 bg-slate-700 rounded animate-pulse" />
            ) : user ? (
              <>
                <Link
                  href="/messages"
                  className="relative px-3 py-2 rounded-md text-sm text-gray-300 hover:bg-slate-700 hover:text-white"
                >
                  Messages
                  {user.messages > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {user.messages}
                    </span>
                  )}
                </Link>
                {(user.access & 0x0100) !== 0 && (
                  <Link
                    href="/admin"
                    className="px-3 py-2 rounded-md text-sm text-gray-300 hover:bg-slate-700 hover:text-white"
                  >
                    Admin
                  </Link>
                )}
                <div className="relative">
                  <button
                    onClick={() => setProfileOpen(!profileOpen)}
                    className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-gray-300 hover:bg-slate-700 hover:text-white"
                  >
                    {user.nickname}
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {profileOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setProfileOpen(false)} />
                      <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg z-20 py-1">
                        <Link
                          href="/profile"
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          onClick={() => setProfileOpen(false)}
                        >
                          Profile
                        </Link>
                        <Link
                          href="/solutions"
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          onClick={() => setProfileOpen(false)}
                        >
                          My Solutions
                        </Link>
                        <hr className="my-1" />
                        <button
                          onClick={() => {
                            setProfileOpen(false);
                            logout();
                          }}
                          className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                        >
                          Logout
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-3 py-2 rounded-md text-sm text-gray-300 hover:bg-slate-700 hover:text-white"
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  className="px-3 py-2 rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700"
                >
                  Register
                </Link>
              </>
            )}
          </div>

          <button
            className="md:hidden p-2 rounded-md text-gray-300 hover:bg-slate-700"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {menuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="md:hidden border-t border-slate-700">
          <div className="px-4 py-3 space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'block px-3 py-2 rounded-md text-sm',
                  pathname.startsWith(link.href)
                    ? 'bg-slate-700 text-white'
                    : 'text-gray-300 hover:bg-slate-700'
                )}
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <hr className="border-slate-700" />
            {user ? (
              <>
                <Link href="/messages" className="block px-3 py-2 text-sm text-gray-300 hover:bg-slate-700" onClick={() => setMenuOpen(false)}>
                  Messages {user.messages > 0 && `(${user.messages})`}
                </Link>
                <Link href="/profile" className="block px-3 py-2 text-sm text-gray-300 hover:bg-slate-700" onClick={() => setMenuOpen(false)}>
                  Profile
                </Link>
                <button onClick={() => { setMenuOpen(false); logout(); }} className="block w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-slate-700">
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="block px-3 py-2 text-sm text-gray-300 hover:bg-slate-700" onClick={() => setMenuOpen(false)}>Login</Link>
                <Link href="/register" className="block px-3 py-2 text-sm text-gray-300 hover:bg-slate-700" onClick={() => setMenuOpen(false)}>Register</Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
