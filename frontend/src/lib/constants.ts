export const CONTEST_TYPES: Record<string, string> = {
  classic: 'Classic',
  acm: 'ACM',
  school: 'School',
  ioi: 'IOI',
  practice: 'Practice',
  otbor: 'Підготовка до олімпіад',
  olympic: 'Олімпіада',
  cert: 'Сертифікація',
};

export const REG_STATUS_LABELS: Record<number, string> = {
  0: 'не зареєстрований',
  1: 'очікує підтвердження',
  2: 'відмовлено',
  3: 'зареєстрований',
};

export const REG_MODE_LABELS: Record<number, string> = {
  0x01: 'вільна реєстрація',
  0x02: 'з підтвердженням',
  0x04: 'внутрішній',
};

// Must match PHP common.php TEST_RESULT_* constants (bitmask values)
export const VERDICT_CODES: Record<number, string> = {
  0x0000: 'OK',   // TEST_RESULT_OK
  0x0001: 'PO',   // TEST_RESULT_PO (partial OK)
  0x0002: 'CE',   // TEST_RESULT_CE
  0x0004: 'WA',   // TEST_RESULT_WA
  0x0008: 'PE',   // TEST_RESULT_PE
  0x0010: 'TL',   // TEST_RESULT_TL
  0x0020: 'ML',   // TEST_RESULT_ML
  0x0040: 'RE',   // TEST_RESULT_RE
  0x0080: 'FF',   // TEST_RESULT_FF
  0x0100: 'ZR',   // TEST_RESULT_ZR
};

export const VERDICT_LABELS: Record<string, string> = {
  OK: 'Accepted',
  PO: 'Partial',
  CE: 'Compilation Error',
  WA: 'Wrong Answer',
  PE: 'Presentation Error',
  TL: 'Time Limit',
  ML: 'Memory Limit',
  RE: 'Runtime Error',
  FF: 'Forbidden Function',
  ZR: 'Zero Result',
  NT: 'Not Tested',
};

// For compound results (bitmask OR of multiple codes), decode the primary verdict
export function decodeVerdict(result: number): string {
  if (result < 0) return 'NT';
  if (result === 0) return 'OK';
  // Check each bit from highest priority to lowest
  if (result & 0x0002) return 'CE';
  if (result & 0x0010) return 'TL';
  if (result & 0x0020) return 'ML';
  if (result & 0x0040) return 'RE';
  if (result & 0x0004) return 'WA';
  if (result & 0x0008) return 'PE';
  if (result & 0x0080) return 'FF';
  if (result & 0x0100) return 'ZR';
  if (result & 0x0001) return 'PO';
  return 'NT';
}

// Decode full verdict string (can have multiple flags, e.g. "WA TL")
export function decodeVerdictFull(result: number): string {
  if (result < 0) return 'NT';
  if (result === 0) return 'OK';
  const parts: string[] = [];
  if (result & 0x0002) parts.push('CE');
  if (result & 0x0004) parts.push('WA');
  if (result & 0x0008) parts.push('PE');
  if (result & 0x0010) parts.push('TL');
  if (result & 0x0020) parts.push('ML');
  if (result & 0x0040) parts.push('RE');
  if (result & 0x0080) parts.push('FF');
  if (result & 0x0100) parts.push('ZR');
  return parts.length > 0 ? parts.join(' ') : 'OK';
}

export const ACCESS = {
  READ_PROBLEMS: 0x0001,
  READ_CONTESTS: 0x0002,
  READ_PROFILES: 0x0004,
  READ_STANDINGS: 0x0008,
  UPLOAD_SOLUTIONS: 0x0010,
  WRITE_PROBLEMS: 0x0100,
  WRITE_CONTESTS: 0x0200,
  WRITE_PROFILES: 0x0400,
  WRITE_REGISTRATION: 0x0800,
  DOWNLOAD_SOLUTIONS: 0x1000,
  UPLOAD_RESULTS: 0x2000,
  SYSTEM_ADMIN: 0x8000,
  ANONYMOUS_USER: 0x0007,
  REGISTERED_USER: 0x001f,
  TEACHER_USER: 0xfffe,
  ADMIN_USER: 0xffff,
} as const;

export const CONTEST_STATUS: Record<string, string> = {
  Going: 'Going',
  Finished: 'Finished',
  Wait: 'Waiting',
  GoingFrozen: 'Going (Frozen)',
  FinishedFrozen: 'Finished (Frozen)',
};

