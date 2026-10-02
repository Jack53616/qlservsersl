const MAP = {
  active: { dot: 'bg-ql-green', text: 'text-ql-green', bg: 'bg-ql-green/10', ring: 'ring-ql-green/25' },
  expired: { dot: 'bg-ql-red', text: 'text-ql-red', bg: 'bg-ql-red/10', ring: 'ring-ql-red/25' },
  unused: { dot: 'bg-ql-text-dim', text: 'text-ql-text-dim', bg: 'bg-white/5', ring: 'ring-white/10' },
  revoked: { dot: 'bg-ql-red', text: 'text-ql-red', bg: 'bg-ql-red/10', ring: 'ring-ql-red/25' },
};

export default function Badge({ status, label }) {
  const s = MAP[status] || MAP.unused;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ring-1 ${s.bg} ${s.text} ${s.ring}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {label}
    </span>
  );
}
