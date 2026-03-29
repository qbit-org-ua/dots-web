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
      return 'text-green-600 bg-green-50';
    case 'WA':
      return 'text-red-600 bg-red-50';
    case 'TL':
    case 'ML':
    case 'IL':
      return 'text-orange-600 bg-orange-50';
    case 'RE':
    case 'SE':
    case 'SV':
      return 'text-purple-600 bg-purple-50';
    case 'CE':
      return 'text-yellow-700 bg-yellow-50';
    case 'WT':
      return 'text-blue-600 bg-blue-50';
    default:
      return 'text-gray-600 bg-gray-50';
  }
}
