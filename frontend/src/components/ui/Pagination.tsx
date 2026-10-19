'use client';

import { useState } from 'react';

export const PAGE_SIZE = 15;

/** Splits a list into pages of 15 (client side). The page snaps back if the list shrinks. */
export function usePagination<T>(items: T[], pageSize = PAGE_SIZE) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const current = Math.min(page, totalPages);
  const pageItems = items.slice((current - 1) * pageSize, current * pageSize);
  return { pageItems, page: current, setPage, totalPages, total: items.length, pageSize };
}

type Pager = ReturnType<typeof usePagination>;

/** Previous/Next bar for a `usePagination` result; hidden when everything fits on one page. */
export default function Pagination({ pager }: { pager: Pick<Pager, 'page' | 'setPage' | 'totalPages' | 'total' | 'pageSize'> }) {
  const { page, setPage, totalPages, total, pageSize } = pager;
  if (total <= pageSize) return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 mt-4 text-sm text-[var(--muted)]">
      <span>Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, total)} of {total}</span>
      <div className="flex items-center gap-2">
        <button onClick={() => setPage(page - 1)} disabled={page <= 1} className="btn-outline text-xs py-1 px-3 disabled:opacity-40">Previous</button>
        <span>Page {page} of {totalPages}</span>
        <button onClick={() => setPage(page + 1)} disabled={page >= totalPages} className="btn-outline text-xs py-1 px-3 disabled:opacity-40">Next</button>
      </div>
    </div>
  );
}
