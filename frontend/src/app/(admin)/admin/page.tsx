'use client';

import React from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';

const adminLinks = [
  { href: '/users', title: 'All Users', description: 'Browse and manage all users' },
  { href: '/problems', title: 'All Problems', description: 'Browse the complete problem archive' },
  { href: '/admin/solutions', title: 'All Solutions', description: 'Browse and filter all user solutions' },
  { href: '/admin/contests/create', title: 'Create Contest', description: 'Create a new contest' },
  { href: '/admin/problems/create', title: 'Create Problem', description: 'Add a new problem to the archive' },
  { href: '/admin/groups', title: 'Groups', description: 'Manage user groups' },
  { href: '/admin/logs', title: 'Logs', description: 'View system logs' },
  { href: '/admin/rejudge', title: 'Rejudge', description: 'Rejudge contest solutions' },
];

export default function AdminDashboard() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {adminLinks.map((link) => (
          <Link key={link.href} href={link.href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardContent>
                <h3 className="font-semibold text-foreground">{link.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">{link.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
