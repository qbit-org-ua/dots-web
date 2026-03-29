'use client';

import React, { useCallback } from 'react';
import { useTheme } from 'next-themes';
import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';

const MonacoEditor = dynamic(() => import('@monaco-editor/react').then(m => m.default), {
  ssr: false,
  loading: () => <Skeleton className="h-[400px] w-full rounded-lg" />,
});

// Map DOTS language names to Monaco language IDs
const LANG_MAP: Record<string, string> = {
  c: 'c', cpp: 'cpp', pascal: 'pascal', delphi: 'pascal',
  'dotnet-csharp': 'csharp', mono: 'csharp',
  openjdk7: 'java', oraclejdk8: 'java', scala: 'scala', kotlin: 'kotlin',
  go: 'go', haskell: 'haskell', ocaml: 'fsharp', nim: 'plaintext',
  rust: 'rust', swift: 'swift', dart: 'dart',
  python2: 'python', python3: 'python', 'python-pypy': 'python', 'python-machinelearning': 'python',
  ruby: 'ruby', php: 'php', bash: 'shell', javascript: 'javascript',
};

export function getMonacoLanguage(langName: string): string {
  const lower = langName.toLowerCase();
  for (const [key, val] of Object.entries(LANG_MAP)) {
    if (lower.includes(key)) return val;
  }
  return 'plaintext';
}

interface CodeEditorProps {
  value: string;
  onChange?: (value: string) => void;
  language?: string;
  readOnly?: boolean;
  height?: string;
}

export function CodeEditor({ value, onChange, language = 'plaintext', readOnly = false, height = '400px' }: CodeEditorProps) {
  const { resolvedTheme } = useTheme();

  const handleChange = useCallback((val: string | undefined) => {
    if (onChange && val !== undefined) onChange(val);
  }, [onChange]);

  return (
    <div className="rounded-lg overflow-hidden ring-1 ring-border">
      <MonacoEditor
        height={height}
        language={language}
        value={value}
        onChange={handleChange}
        theme={resolvedTheme === 'dark' ? 'vs-dark' : 'vs'}
        options={{
          readOnly,
          minimap: { enabled: false },
          fontSize: 14,
          lineNumbers: 'on',
          scrollBeyondLastLine: false,
          wordWrap: 'on',
          tabSize: 4,
          automaticLayout: true,
          padding: { top: 8, bottom: 8 },
          domReadOnly: readOnly,
        }}
      />
    </div>
  );
}
