'use client';

import { Globe, Check } from 'lucide-react';
import { useTranslation, LOCALES, type Locale } from '@/lib/i18n';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';

export function LocaleToggle() {
  const { locale, setLocale, t } = useTranslation();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t('common.switchLocale')}
        className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-all cursor-pointer hover:bg-accent hover:text-accent-foreground h-9 w-9"
      >
        <Globe className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8}>
        {(Object.entries(LOCALES) as [Locale, string][]).map(([code, name]) => (
          <DropdownMenuItem
            key={code}
            onClick={() => setLocale(code)}
          >
            {locale === code && <Check className="size-4 mr-2" />}
            {locale !== code && <span className="w-4 mr-2" />}
            {name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
