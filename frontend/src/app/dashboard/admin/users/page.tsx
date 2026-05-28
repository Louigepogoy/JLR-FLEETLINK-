'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import api from '@/lib/api';

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);

  const fetchUsers = () => api.get('/users').then((res) => setUsers(res.data.data)).catch(() => {});
  useEffect(() => { fetchUsers(); }, []);

  const toggleStatus = async (id: string, isActive: boolean) => {
    await api.patch(`/users/${id}/status`, { isActive: !isActive });
    toast.success('User status updated');
    fetchUsers();
  };

  const changeRole = async (id: string, role: string) => {
    await api.patch(`/users/${id}/role`, { role });
    toast.success('Role updated');
    fetchUsers();
  };

  return (
    <DashboardLayout role="admin">
      <h2 className="text-2xl font-bold mb-6">User Management</h2>
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
                  <select value={u.role} onChange={(e) => changeRole(u.id, e.target.value)}
                    className="text-xs rounded-lg border border-[var(--card-border)] bg-transparent px-2 py-1 capitalize">
                    <option value="customer">customer</option>
                    <option value="owner">owner</option>
                    <option value="admin">admin</option>
                  </select>
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
                <td className="p-4">
                  <button onClick={() => toggleStatus(u.id, u.is_active)} className="text-xs btn-outline py-1 px-3">
                    {u.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DashboardLayout>
  );
}
