'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Users } from 'lucide-react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import EmptyState from '@/components/ui/EmptyState';
import api from '@/lib/api';

export default function AdminUsersPage() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);

  const fetchUsers = () => api.get('/users').then((res) => setUsers(res.data.data)).catch(() => {}).finally(() => setLoading(false));
  useEffect(() => { fetchUsers(); }, []);

  const toggleStatus = async (id: string, isActive: boolean) => {
    await api.patch(`/users/${id}/status`, { isActive: !isActive });
    toast.success('User status updated');
    fetchUsers();
  };

  const toggleAdmin = async (id: string, isAdmin: boolean) => {
    await api.patch(`/users/${id}/role`, { role: isAdmin ? 'user' : 'admin' });
    toast.success(isAdmin ? 'Admin access removed' : 'Promoted to admin');
    fetchUsers();
  };

  if (loading) {
    return (
      <DashboardLayout role="admin">
        <div className="skeleton h-8 w-56 mb-6" />
        <div className="skeleton h-64 rounded-2xl" />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="admin">
      <h2 className="text-2xl font-bold mb-6">User Management</h2>
      {users.length === 0 ? (
        <EmptyState icon={Users} title="No users found" />
      ) : (
      <div className="glass-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--card-border)]">
              <th className="text-left p-4">Name</th>
              <th className="text-left p-4">Email</th>
              <th className="text-left p-4">Role</th>
              <th className="text-left p-4">Approval</th>
              <th className="text-left p-4">Status</th>
              <th className="text-left p-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u: { id: string; full_name: string; email: string; role: string; is_active: boolean; approval_status?: string }) => (
              <tr key={u.id} className="border-b border-[var(--card-border)]">
                <td className="p-4 font-medium">{u.full_name}</td>
                <td className="p-4 text-[var(--muted)]">{u.email}</td>
                <td className="p-4">
                  <span className={`text-xs px-2 py-1 rounded-full capitalize ${
                    u.role === 'admin' ? 'bg-violet-500/20 text-violet-500' : 'bg-[var(--primary)]/20'
                  }`}>
                    {u.role}
                  </span>
                </td>
                <td className="p-4">
                  <span className={`text-xs px-2 py-1 rounded-full capitalize ${
                    u.approval_status === 'approved' ? 'bg-green-500/20 text-green-500' :
                    u.approval_status === 'pending' ? 'bg-amber-500/20 text-amber-500' :
                    'bg-red-500/20 text-red-500'
                  }`}>
                    {u.approval_status || 'approved'}
                  </span>
                </td>
                <td className="p-4">
                  <span className={`text-xs px-2 py-1 rounded-full ${u.is_active ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                    {u.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="p-4 space-x-2">
                  <button onClick={() => toggleStatus(u.id, u.is_active)} className="text-xs btn-outline py-1 px-3">
                    {u.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                  <button onClick={() => toggleAdmin(u.id, u.role === 'admin')} className="text-xs btn-outline py-1 px-3">
                    {u.role === 'admin' ? 'Remove Admin' : 'Make Admin'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}
    </DashboardLayout>
  );
}
