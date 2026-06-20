interface StatusBadgeProps {
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

const statusConfig: Record<
  StatusBadgeProps['status'],
  { label: string; className: string }
> = {
  PENDING:  { label: '대기중', className: 'badge badge-pending' },
  APPROVED: { label: '승인됨', className: 'badge badge-approved' },
  REJECTED: { label: '반려됨', className: 'badge badge-rejected' },
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  const { label, className } = statusConfig[status];

  return (
    <span className={className}>
      <span className="badge-dot" />
      {label}
    </span>
  );
}
