export const CONTEST_TYPES: Record<string, string> = {
  classic: 'Classic',
  acm: 'ACM-ICPC',
  school: 'School',
  ioi: 'IOI',
  practice: 'Practice',
};

export const VERDICT_CODES: Record<number, string> = {
  0x0000: 'OK',
  0x0001: 'CE',
  0x0002: 'RE',
  0x0003: 'PE',
  0x0004: 'WA',
  0x0005: 'SE',
  0x0006: 'CF',
  0x0010: 'TL',
  0x0020: 'ML',
  0x0030: 'IL',
  0x0040: 'SV',
  0x00FF: 'SK',
  0xFFFF: 'WT',
};

export const VERDICT_LABELS: Record<string, string> = {
  OK: 'Accepted',
  CE: 'Compilation Error',
  RE: 'Runtime Error',
  PE: 'Presentation Error',
  WA: 'Wrong Answer',
  SE: 'Security Error',
  CF: 'Check Failed',
  TL: 'Time Limit',
  ML: 'Memory Limit',
  IL: 'Idleness Limit',
  SV: 'Security Violation',
  SK: 'Skipped',
  WT: 'Waiting',
};

export const ACCESS = {
  USER: 0,
  ADMIN: 1,
  SUPER_ADMIN: 2,
} as const;

export const CONTEST_STATUS: Record<string, string> = {
  going: 'Going',
  finished: 'Finished',
  wait: 'Waiting',
  not_started: 'Not Started',
};

export const STATUS_COLORS: Record<string, string> = {
  going: 'success',
  finished: 'neutral',
  wait: 'warning',
  not_started: 'info',
};
