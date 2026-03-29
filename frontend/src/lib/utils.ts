import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, fromUnixTime } from 'date-fns';
import { decodeVerdict } from './constants';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(timestamp: number): string {
  if (!timestamp) return '-';
  return format(fromUnixTime(timestamp), 'dd.MM.yyyy');
}

export function formatDateTime(timestamp: number): string {
  if (!timestamp) return '-';
  return format(fromUnixTime(timestamp), 'dd.MM.yyyy HH:mm:ss');
}

export function formatDuration(seconds: number): string {
  if (!seconds) return '00:00:00';
  const days = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const hms = [h, m, s].map((v) => String(v).padStart(2, '0')).join(':');
  if (days > 0) {
    return `${days} - ${hms}`;
  }
  return hms;
}

export function verdictCode(result: number): string {
  return decodeVerdict(result);
}

export function verdictColor(code: string): string {
  switch (code) {
    case 'OK':
      return 'text-green-700 dark:text-green-300 bg-green-500/10';
    case 'WA':
      return 'text-red-700 dark:text-red-300 bg-red-500/10';
    case 'TL':
    case 'ML':
    case 'IL':
      return 'text-orange-700 dark:text-orange-300 bg-orange-500/10';
    case 'RE':
    case 'SE':
    case 'SV':
      return 'text-purple-700 dark:text-purple-300 bg-purple-500/10';
    case 'CE':
      return 'text-yellow-700 dark:text-yellow-300 bg-yellow-500/10';
    case 'WT':
      return 'text-blue-700 dark:text-blue-300 bg-blue-500/10';
    default:
      return 'text-muted-foreground bg-muted';
  }
}
