'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { Modal } from '@/components/ui/modal';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import type { Group } from '@/types';

export default function AdminGroupsPage() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editGroup, setEditGroup] = useState<Group | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-groups'],
    queryFn: async () => {
      const res = await api.get('/api/v1/admin/groups');
      return res.data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editGroup) {
        await api.put(`/api/v1/admin/groups/${editGroup.group_id}`, { name, description });
      } else {
        await api.post('/api/v1/admin/groups', { name, description });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-groups'] });
      setShowModal(false);
      setEditGroup(null);
      setName('');
      setDescription('');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (groupId: number) => {
      await api.delete(`/api/v1/admin/groups/${groupId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-groups'] });
    },
  });

  const groups: Group[] = data?.groups ?? [];

  const openCreate = () => {
    setEditGroup(null);
    setName('');
    setDescription('');
    setShowModal(true);
  };

  const openEdit = (group: Group) => {
    setEditGroup(group);
    setName(group.name);
    setDescription(group.description);
    setShowModal(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Groups</h1>
        <Button onClick={openCreate} size="sm">Create Group</Button>
      </div>

      {isLoading ? (
        <Spinner />
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groups.map((g) => (
                <TableRow key={g.group_id}>
                  <TableCell>{g.group_id}</TableCell>
                  <TableCell className="font-medium">{g.name}</TableCell>
                  <TableCell className="text-gray-500">{g.description}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(g)}>Edit</Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => {
                          if (confirm('Delete this group?')) deleteMutation.mutate(g.group_id);
                        }}
                      >
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editGroup ? 'Edit Group' : 'Create Group'}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            saveMutation.mutate();
          }}
          className="space-y-4"
        >
          <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} required />
          <Input label="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
          <div className="flex gap-3">
            <Button type="submit" loading={saveMutation.isPending}>Save</Button>
            <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
