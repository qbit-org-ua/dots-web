'use client';

import React from 'react';
import { verdictCode, verdictColor } from '@/lib/utils';
import { decodeVerdictFull } from '@/lib/constants';
import { useTranslation } from '@/lib/i18n';

interface VerdictBadgeProps {
  result: number;
  short?: boolean;
  full?: boolean; // show all verdict flags (e.g. "WA TL" instead of just "TL")
}

export function VerdictBadge({ result, short = false, full = false }: VerdictBadgeProps) {
  const { t } = useTranslation();

  if (result === undefined || result === null) return <span className="text-muted-foreground text-xs">-</span>;

  if (result < 0) {
    // Pending testing
    return (
      <span className="inline-flex items-center rounded px-2 py-0.5 text-xs font-medium text-blue-700 dark:text-blue-300 bg-blue-500/10">
        {t('verdicts.NT')}
      </span>
    );
  }

  const primaryCode = verdictCode(result);
  const color = verdictColor(primaryCode);

  if (full && result > 0) {
    // Show all flags as separate badges
    const fullStr = decodeVerdictFull(result);
    const codes = fullStr.split(' ');
    if (codes.length > 1) {
      return (
        <span className="inline-flex items-center gap-1 flex-wrap">
          {codes.map((code, i) => (
            <span key={i} className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium ${verdictColor(code)}`}>
              {short ? code : t('verdicts.' + code)}
            </span>
          ))}
        </span>
      );
    }
  }

  const label = short ? primaryCode : t('verdicts.' + primaryCode);

  return (
    <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${color}`}>
      {label}
    </span>
  );
}
