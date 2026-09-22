import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function AdminPagination({ pageNo = 0, totalPages = 0, onChange }) {
  if (totalPages <= 1) return null;

  const pages = [];
  const maxButtons = 5;
  let start = Math.max(0, pageNo - Math.floor(maxButtons / 2));
  let end = Math.min(totalPages - 1, start + maxButtons - 1);
  start = Math.max(0, end - maxButtons + 1);

  for (let i = start; i <= end; i += 1) pages.push(i);

  return (
    <div className="pagination hg-admin-pagination">
      <button
        type="button"
        className="page-btn"
        disabled={pageNo <= 0}
        onClick={() => onChange(pageNo - 1)}
        aria-label="Trang trước"
      >
        <ChevronLeft size={16} />
      </button>
      {pages.map((p) => (
        <button
          key={p}
          type="button"
          className={`page-btn ${p === pageNo ? 'active' : ''}`}
          onClick={() => onChange(p)}
        >
          {p + 1}
        </button>
      ))}
      <button
        type="button"
        className="page-btn"
        disabled={pageNo >= totalPages - 1}
        onClick={() => onChange(pageNo + 1)}
        aria-label="Trang sau"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}
