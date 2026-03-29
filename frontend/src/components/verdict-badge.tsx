'use client';

import React from 'react';
import { verdictCode, verdictColor } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n';

interface VerdictBadgeProps {
  result: number;
  short?: boolean;
}

export function VerdictBadge({ result, short = false }: VerdictBadgeProps) {
  const { t } = useTranslation();

  if (result === undefined || result === null) return <span className="text-muted-foreground text-xs">-</span>;
  const code = verdictCode(result);
  const color = verdictColor(code);
  const label = t('verdicts.' + code);

  return (
    <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${color}`}>
      {short ? code : label}
    </span>
  );
}
