import { useEffect, useState } from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

function useCountUp(target, duration = 900) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let raf;
    const start = performance.now();
    const from = 0;
    const to = Number(target) || 0;
    function tick(now) {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(from + (to - from) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

export default function StatCard({ icon: Icon, label, value, trend, color = 'green', delay = 0 }) {
  const n = useCountUp(value);
  const colorMap = {
    green: { text: 'text-ql-green', bg: 'bg-ql-green/10', ring: 'ring-ql-green/20' },
    blue: { text: 'text-ql-blue', bg: 'bg-ql-blue/10', ring: 'ring-ql-blue/20' },
    purple: { text: 'text-ql-purple', bg: 'bg-ql-purple/10', ring: 'ring-ql-purple/20' },
    red: { text: 'text-ql-red', bg: 'bg-ql-red/10', ring: 'ring-ql-red/20' },
    orange: { text: 'text-ql-orange', bg: 'bg-ql-orange/10', ring: 'ring-ql-orange/20' },
  }[color];

  const positive = trend == null ? null : trend >= 0;

  return (
    <div
      className="glass rounded-2xl p-4 animate-fade-up hover:border-white/15 transition-colors"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ring-1 ${colorMap.bg} ${colorMap.ring}`}>
          <Icon size={17} className={colorMap.text} />
        </div>
        {trend != null && (
          <span className={`flex items-center gap-0.5 text-xs font-semibold ${positive ? 'text-ql-green' : 'text-ql-red'}`}>
            {positive ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div className="text-2xl font-extrabold num-tabular">{n.toLocaleString()}</div>
      <div className="text-xs text-ql-text-dim mt-1">{label}</div>
    </div>
  );
}
