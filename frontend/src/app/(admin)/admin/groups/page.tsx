'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { FormInput } from '@/components/ui/form-field';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
    setName(group.group_name);
    setDescription(group.group_description || '');
    setShowModal(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Groups</h1>
        <Button onClick={openCreate} size="sm">Create Group</Button>
      </div>

      {isLoading ? (
        <Spinner />
      ) : (
        <div className="bg-card rounded-lg shadow-sm ring-1 ring-border overflow-hidden">
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
                  <TableCell className="font-medium">{g.group_name}</TableCell>
                  <TableCell className="text-muted-foreground">{g.group_description}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(g)}>Edit</Button>
                      <Button
                        size="sm"
                        variant="destructive"
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

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editGroup ? 'Edit Group' : 'Create Group'}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveMutation.mutate();
            }}
            className="space-y-4"
          >
            <FormInput label="Name" value={name} onChange={(e) => setName(e.target.value)} required />
            <FormInput label="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
            <DialogFooter>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? 'Saving...' : 'Save'}
              </Button>
              <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
