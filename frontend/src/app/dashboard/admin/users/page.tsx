'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { MessageCircle, Search, Users } from 'lucide-react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { IconChip, UsersIcon } from '@/components/illustrations/MiniIcons';
import EmptyState from '@/components/ui/EmptyState';
import api from '@/lib/api';
import { apiErrorMessage, messagesPath, profilePath, startConversation } from '@/lib/chat';
import { useAuthStore } from '@/store/authStore';

const PAGE_SIZE = 15;

interface AdminUser {
  id: string;
  full_name: string;
  email: string;
  role: string;
  is_active: boolean;
  approval_status?: string;
}

const approvalLabel = (status?: string) => (!status || status === 'approved' ? 'Verified' : status);

export default function AdminUsersPage() {
  const router = useRouter();
  const currentUserId = useAuthStore((state) => state.user?.id);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const term = search.trim().toLowerCase();
  const filtered = term
    ? users.filter((u) => `${u.full_name} ${u.email} ${u.role}`.toLowerCase().includes(term))
    : users;
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageUsers = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const messageUser = async (userId: string) => {
    try {
      const conversation = await startConversation({ userId });
      router.push(messagesPath('admin', conversation.id));
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not start chat'));
    }
  };

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
      <h2 className="text-2xl font-bold flex items-center gap-3 mb-6"><IconChip icon={UsersIcon} className="h-10 w-10 rounded-xl" iconClassName="h-7 w-7" />User Management</h2>
      <div className="relative mb-4 max-w-md">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
        <input
          type="search"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search by name, email or role"
          className="input-field pl-9 w-full"
        />
      </div>
      {filtered.length === 0 ? (
        <EmptyState icon={Users} title="No users found" />
      ) : (
      <>
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
            {pageUsers.map((u) => (
              <tr key={u.id} className="border-b border-[var(--card-border)]">
                <td className="p-4 font-medium">
                  <Link href={profilePath(u.id)} className="hover:underline hover:text-[var(--primary)]">{u.full_name}</Link>
                </td>
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
                    !u.approval_status || u.approval_status === 'approved' ? 'bg-green-500/20 text-green-500' :
                    u.approval_status === 'pending' ? 'bg-amber-500/20 text-amber-500' :
                    'bg-red-500/20 text-red-500'
                  }`}>
                    {approvalLabel(u.approval_status)}
                  </span>
                </td>
                <td className="p-4">
                  <span className={`text-xs px-2 py-1 rounded-full ${u.is_active ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                    {u.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="p-4 space-x-2 whitespace-nowrap">
                  {u.id !== currentUserId && u.is_active && (
                    <button onClick={() => messageUser(u.id)} className="text-xs btn-outline py-1 px-3 inline-flex items-center gap-1">
                      <MessageCircle className="w-3 h-3" /> Message
                    </button>
                  )}
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
      <div className="flex items-center justify-between mt-4 text-sm text-[var(--muted)]">
        <span>
          Showing {(currentPage - 1) * PAGE_SIZE + 1}-{Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length}
        </span>
        <div className="flex items-center gap-2">
          <button onClick={() => setPage(currentPage - 1)} disabled={currentPage <= 1} className="btn-outline text-xs py-1 px-3 disabled:opacity-40">Previous</button>
          <span>Page {currentPage} of {totalPages}</span>
          <button onClick={() => setPage(currentPage + 1)} disabled={currentPage >= totalPages} className="btn-outline text-xs py-1 px-3 disabled:opacity-40">Next</button>
        </div>
      </div>
      </>
      )}
    </DashboardLayout>
  );
}
