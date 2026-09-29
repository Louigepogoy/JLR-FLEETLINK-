'use client';

import { Suspense } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { IconChip, MessagesIcon } from '@/components/illustrations/MiniIcons';
import ChatInbox from '@/components/chat/ChatInbox';

export default function AdminMessagesPage() {
  return (
    <DashboardLayout role="admin">
      <h2 className="mb-4 flex items-center gap-3 text-2xl font-bold">
        <IconChip icon={MessagesIcon} className="h-10 w-10 rounded-xl" iconClassName="h-7 w-7" />Messages
      </h2>
      {/* ChatInbox reads ?c= via useSearchParams, which needs a Suspense boundary. */}
      <Suspense fallback={<div className="skeleton h-[480px] rounded-2xl" />}>
        <ChatInbox role="admin" />
      </Suspense>
    </DashboardLayout>
  );
}
