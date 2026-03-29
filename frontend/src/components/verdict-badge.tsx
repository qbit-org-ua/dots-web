import React from 'react';
import { verdictCode, verdictColor } from '@/lib/utils';
import { VERDICT_LABELS } from '@/lib/constants';

interface VerdictBadgeProps {
  result: number;
  short?: boolean;
}

export function VerdictBadge({ result, short = false }: VerdictBadgeProps) {
  if (result === undefined || result === null) return <span className="text-muted-foreground text-xs">-</span>;
  const code = verdictCode(result);
  const color = verdictColor(code);
  const label = VERDICT_LABELS[code] || code;

  return (
    <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${color}`}>
      {short ? code : label}
    </span>
  );
}
