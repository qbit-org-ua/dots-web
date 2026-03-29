'use client';

import React from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';

const adminLinks = [
  { href: '/admin/contests/create', title: 'Create Contest', description: 'Create a new contest' },
  { href: '/admin/problems/create', title: 'Create Problem', description: 'Add a new problem to the archive' },
  { href: '/admin/solutions', title: 'All Solutions', description: 'Browse and filter all user solutions' },
  { href: '/admin/groups', title: 'Groups', description: 'Manage user groups' },
  { href: '/admin/logs', title: 'Logs', description: 'View system logs' },
  { href: '/admin/rejudge', title: 'Rejudge', description: 'Rejudge contest solutions' },
];

export default function AdminDashboard() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {adminLinks.map((link) => (
          <Link key={link.href} href={link.href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <h3 className="font-semibold text-gray-900">{link.title}</h3>
              <p className="text-sm text-gray-500 mt-1">{link.description}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
