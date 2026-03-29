'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { Menu, User, LogOut, Settings, Mail, Code2 } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

const navLinks = [
  { href: '/contests', label: 'Contests' },
];

export function Nav() {
  const { user, isLoading, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [sheetOpen, setSheetOpen] = React.useState(false);

  return (
    <header className="bg-card border-b border-border shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-1.5 text-xl font-bold tracking-tight text-primary hover:text-primary/80">
              <Code2 className="size-5" />
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
                      ? 'bg-primary/10 text-primary font-semibold'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="hidden md:flex items-center gap-2">
            <ThemeToggle />
            {isLoading ? (
              <div className="w-20 h-5 bg-muted rounded animate-pulse" />
            ) : user ? (
              <>
                <Link
                  href="/messages"
                  className="relative px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <Mail className="size-4 inline-block mr-1" />
                  Messages
                  {user.messages > 0 && (
                    <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {user.messages}
                    </span>
                  )}
                </Link>
                {(user.access & 0x0100) !== 0 && (
                  <Link
                    href="/admin"
                    className="px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    Admin
                  </Link>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger>
                    <button className="inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-md text-sm font-medium transition-all cursor-pointer hover:bg-accent hover:text-accent-foreground h-9 px-3">
                      <User className="size-4" />
                      {user.nickname}
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" sideOffset={8}>
                    <DropdownMenuItem onClick={() => router.push('/profile')}>
                      <Settings className="size-4 mr-2" />
                      Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push('/solutions')}>
                      My Solutions
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => logout()}
                    >
                      <LogOut className="size-4 mr-2" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <Link href="/login" className="px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-muted hover:text-foreground">
                  Login
                </Link>
                <Link href="/register" className="inline-flex items-center justify-center rounded-md text-sm font-medium h-9 px-3 bg-primary text-primary-foreground hover:bg-primary/90">
                  Register
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu */}
          <div className="md:hidden flex items-center gap-2">
            <ThemeToggle />
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
              <SheetTrigger>
                <button className="inline-flex items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground h-9 w-9" aria-label="Open menu">
                  <Menu className="size-5" />
                </button>
              </SheetTrigger>
              <SheetContent side="right">
                <SheetHeader>
                  <SheetTitle>Menu</SheetTitle>
                </SheetHeader>
                <div className="flex flex-col gap-1 p-4">
                  {navLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setSheetOpen(false)}
                      className={cn(
                        'block px-3 py-2 rounded-md text-sm',
                        pathname.startsWith(link.href)
                          ? 'bg-muted text-foreground font-medium'
                          : 'text-muted-foreground hover:bg-muted'
                      )}
                    >
                      {link.label}
                    </Link>
                  ))}
                  <div className="border-t border-border my-2" />
                  {user ? (
                    <>
                      <Link href="/messages" onClick={() => setSheetOpen(false)} className="block px-3 py-2 text-sm text-muted-foreground hover:bg-muted rounded-md">
                        Messages {user.messages > 0 && `(${user.messages})`}
                      </Link>
                      <Link href="/profile" onClick={() => setSheetOpen(false)} className="block px-3 py-2 text-sm text-muted-foreground hover:bg-muted rounded-md">
                        Profile
                      </Link>
                      <Link href="/solutions" onClick={() => setSheetOpen(false)} className="block px-3 py-2 text-sm text-muted-foreground hover:bg-muted rounded-md">
                        My Solutions
                      </Link>
                      {(user.access & 0x0100) !== 0 && (
                        <Link href="/admin" onClick={() => setSheetOpen(false)} className="block px-3 py-2 text-sm text-muted-foreground hover:bg-muted rounded-md">
                          Admin
                        </Link>
                      )}
                      <button
                        onClick={() => { setSheetOpen(false); logout(); }}
                        className="block w-full text-left px-3 py-2 text-sm text-destructive hover:bg-muted rounded-md"
                      >
                        Logout
                      </button>
                    </>
                  ) : (
                    <>
                      <Link href="/login" onClick={() => setSheetOpen(false)} className="block px-3 py-2 text-sm text-muted-foreground hover:bg-muted rounded-md">
                        Login
                      </Link>
                      <Link href="/register" onClick={() => setSheetOpen(false)} className="block px-3 py-2 text-sm text-muted-foreground hover:bg-muted rounded-md">
                        Register
                      </Link>
                    </>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
