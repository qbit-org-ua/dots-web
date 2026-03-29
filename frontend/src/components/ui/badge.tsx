import React from 'react';
import { cn } from '@/lib/utils';

const colorMap = {
  success: 'bg-green-100 text-green-800',
  warning: 'bg-yellow-100 text-yellow-800',
  danger: 'bg-red-100 text-red-800',
  info: 'bg-blue-100 text-blue-800',
  neutral: 'bg-gray-100 text-gray-800',
};

interface BadgeProps {
  children: React.ReactNode;
  color?: keyof typeof colorMap;
  className?: string;
}

export function Badge({ children, color = 'neutral', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        colorMap[color],
        className
      )}
    >
      {children}
    </span>
  );
}
