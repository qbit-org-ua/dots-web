'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import type { Contest, ContestProblem } from '@/types';

export default function AdminRejudgePage() {
  const [contestId, setContestId] = useState('');
  const [problemId, setProblemId] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');

  const { data: contestsData } = useQuery({
    queryKey: ['contests-all'],
    queryFn: async () => {
      const res = await api.get('/api/v1/contests', { params: { per_page: 100 } });
      return res.data;
    },
  });

  const { data: problemsData } = useQuery({
    queryKey: ['contest-problems', contestId],
    queryFn: async () => {
      const res = await api.get(`/api/v1/contests/${contestId}/problems`);
      return res.data;
    },
    enabled: !!contestId,
  });

  const contests: Contest[] = contestsData?.contests ?? [];
  const problems: ContestProblem[] = problemsData?.problems ?? [];

  const handleRejudge = async () => {
    setLoading(true);
    setResult('');
    try {
      await api.post('/api/v1/admin/rejudge', {
        contest_id: Number(contestId),
        problem_id: problemId ? Number(problemId) : undefined,
      });
      setResult('Rejudge started successfully.');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Rejudge failed';
      setResult(`Error: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold text-gray-900">Rejudge Solutions</h1>

      <Card>
        <div className="space-y-4">
          <Select
            label="Contest"
            value={contestId}
            onChange={(e) => {
              setContestId(e.target.value);
              setProblemId('');
            }}
            options={contests.map((c) => ({ value: c.contest_id, label: c.title }))}
          />
          {contestId && (
            <Select
              label="Problem (optional - leave empty for all)"
              value={problemId}
              onChange={(e) => setProblemId(e.target.value)}
              options={problems.map((p) => ({ value: p.problem_id, label: `${p.short_name}. ${p.title}` }))}
            />
          )}
          <Button onClick={handleRejudge} loading={loading} disabled={!contestId} variant="danger">
            Start Rejudge
          </Button>
          {result && (
            <div className={`text-sm rounded-md p-3 ${result.startsWith('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
              {result}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
