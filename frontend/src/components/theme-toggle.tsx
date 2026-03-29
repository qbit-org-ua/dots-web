'use client';

import { useTheme } from 'next-themes';
import { Sun, Moon } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const { t } = useTranslation();

  return (
    <Tooltip>
      <TooltipTrigger
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        aria-label="Toggle theme"
        className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-all cursor-pointer hover:bg-accent hover:text-accent-foreground h-9 w-9"
      >
        <Sun className="size-4 hidden dark:block" />
        <Moon className="size-4 block dark:hidden" />
      </TooltipTrigger>
      <TooltipContent>
        {t('common.switchTheme')} {theme === 'dark' ? t('common.lightMode') : t('common.darkMode')}
      </TooltipContent>
    </Tooltip>
  );
}
