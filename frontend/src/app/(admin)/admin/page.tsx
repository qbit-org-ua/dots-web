'use client';

import React from 'react';
import Link from 'next/link';
import { useTranslation } from '@/lib/i18n';
import { Card, CardContent } from '@/components/ui/card';

export default function AdminDashboard() {
  const { t } = useTranslation();

  const adminLinks = [
    { href: '/users', title: t('admin.allUsers'), description: t('admin.allUsersDesc') },
    { href: '/problems', title: t('admin.allProblems'), description: t('admin.allProblemsDesc') },
    { href: '/admin/solutions', title: t('admin.allSolutions'), description: t('admin.allSolutionsDesc') },
    { href: '/admin/contests/create', title: t('admin.createContest'), description: t('admin.createContestDesc') },
    { href: '/admin/problems/create', title: t('admin.createProblem'), description: t('admin.createProblemDesc') },
    { href: '/admin/groups', title: t('admin.groups'), description: t('admin.groupsDesc') },
    { href: '/admin/logs', title: t('admin.logs'), description: t('admin.logsDesc') },
    { href: '/admin/rejudge', title: t('admin.rejudge'), description: t('admin.rejudgeDesc') },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">{t('admin.dashboard')}</h1>
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
