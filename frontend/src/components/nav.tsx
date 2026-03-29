'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { Menu, User, LogOut, Settings, Mail, Code2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
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
  SheetClose,
} from '@/components/ui/sheet';

const navLinks = [
  { href: '/contests', label: 'Contests' },
];

export function Nav() {
  const { user, isLoading, logout } = useAuth();
  const pathname = usePathname();

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
                  <DropdownMenuTrigger
                    render={
                      <Button variant="ghost" size="sm">
                        <User className="size-4 mr-1" />
                        {user.nickname}
                      </Button>
                    }
                  />
                  <DropdownMenuContent align="end" sideOffset={8}>
                    <DropdownMenuItem render={<Link href="/profile" />}>
                      <Settings className="size-4 mr-2" />
                      Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem render={<Link href="/solutions" />}>
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
                <Link href="/login">
                  <Button variant="ghost" size="sm">Login</Button>
                </Link>
                <Link href="/register">
                  <Button size="sm">Register</Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu */}
          <div className="md:hidden flex items-center gap-2">
            <ThemeToggle />
            <Sheet>
              <SheetTrigger render={<Button variant="ghost" size="icon" />}>
                <Menu className="size-5" />
              </SheetTrigger>
              <SheetContent side="right">
                <SheetHeader>
                  <SheetTitle>Menu</SheetTitle>
                </SheetHeader>
                <div className="flex flex-col gap-1 p-4">
                  {navLinks.map((link) => (
                    <SheetClose key={link.href} render={<Link href={link.href} />}>
                      <span
                        className={cn(
                          'block px-3 py-2 rounded-md text-sm',
                          pathname.startsWith(link.href)
                            ? 'bg-muted text-foreground font-medium'
                            : 'text-muted-foreground hover:bg-muted'
                        )}
                      >
                        {link.label}
                      </span>
                    </SheetClose>
                  ))}
                  <div className="border-t border-border my-2" />
                  {user ? (
                    <>
                      <SheetClose render={<Link href="/messages" />}>
                        <span className="block px-3 py-2 text-sm text-muted-foreground hover:bg-muted rounded-md">
                          Messages {user.messages > 0 && `(${user.messages})`}
                        </span>
                      </SheetClose>
                      <SheetClose render={<Link href="/profile" />}>
                        <span className="block px-3 py-2 text-sm text-muted-foreground hover:bg-muted rounded-md">
                          Profile
                        </span>
                      </SheetClose>
                      <SheetClose render={<Link href="/solutions" />}>
                        <span className="block px-3 py-2 text-sm text-muted-foreground hover:bg-muted rounded-md">
                          My Solutions
                        </span>
                      </SheetClose>
                      {(user.access & 0x0100) !== 0 && (
                        <SheetClose render={<Link href="/admin" />}>
                          <span className="block px-3 py-2 text-sm text-muted-foreground hover:bg-muted rounded-md">
                            Admin
                          </span>
                        </SheetClose>
                      )}
                      <button
                        onClick={() => logout()}
                        className="block w-full text-left px-3 py-2 text-sm text-destructive hover:bg-muted rounded-md"
                      >
                        Logout
                      </button>
                    </>
                  ) : (
                    <>
                      <SheetClose render={<Link href="/login" />}>
                        <span className="block px-3 py-2 text-sm text-muted-foreground hover:bg-muted rounded-md">Login</span>
                      </SheetClose>
                      <SheetClose render={<Link href="/register" />}>
                        <span className="block px-3 py-2 text-sm text-muted-foreground hover:bg-muted rounded-md">Register</span>
                      </SheetClose>
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
