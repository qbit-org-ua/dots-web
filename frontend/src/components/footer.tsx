'use client';

import React from 'react';
import { useTranslation } from '@/lib/i18n';

export function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="bg-muted text-muted-foreground py-6 mt-auto border-t border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm">
        {t('common.footer')} &copy; {new Date().getFullYear()}
      </div>
    </footer>
  );
}
