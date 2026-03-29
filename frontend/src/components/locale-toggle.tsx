'use client';

import { Globe } from 'lucide-react';
import { useTranslation, LOCALES, type Locale } from '@/lib/i18n';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

export function LocaleToggle() {
  const { locale, setLocale } = useTranslation();
  const nextLocale: Locale = locale === 'uk' ? 'en' : 'uk';

  return (
    <Tooltip>
      <TooltipTrigger
        onClick={() => setLocale(nextLocale)}
        aria-label="Toggle language"
        className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-all cursor-pointer hover:bg-accent hover:text-accent-foreground h-9 w-9"
      >
        <Globe className="size-4" />
      </TooltipTrigger>
      <TooltipContent>
        {LOCALES[nextLocale]}
      </TooltipContent>
    </Tooltip>
  );
}
