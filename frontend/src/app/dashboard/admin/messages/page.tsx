'use client';

import { Suspense } from 'react';
import { MessageCircle } from 'lucide-react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import ChatInbox from '@/components/chat/ChatInbox';

export default function AdminMessagesPage() {
  return (
    <DashboardLayout role="admin">
      <h2 className="mb-4 flex items-center gap-2 text-2xl font-bold">
        <MessageCircle className="h-6 w-6 text-[var(--primary)]" /> Messages
      </h2>
      {/* ChatInbox reads ?c= via useSearchParams, which needs a Suspense boundary. */}
      <Suspense fallback={<div className="skeleton h-[480px] rounded-2xl" />}>
        <ChatInbox role="admin" />
      </Suspense>
    </DashboardLayout>
  );
}
