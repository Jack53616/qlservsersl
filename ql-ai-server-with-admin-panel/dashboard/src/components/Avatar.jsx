export default function Avatar({ name, url, size = 36, className = '' }) {
  const style = { width: size, height: size, fontSize: Math.round(size * 0.4) };
  if (url) {
    return (
      <img
        src={url}
        alt={name || 'avatar'}
        style={style}
        className={`rounded-full object-cover shrink-0 ring-1 ring-white/10 ${className}`}
      />
    );
  }
  return (
    <div
      style={style}
      className={`rounded-full bg-gradient-to-br from-ql-green to-ql-blue flex items-center justify-center text-black font-bold shrink-0 ${className}`}
    >
      {(name || '?').slice(0, 1).toUpperCase()}
    </div>
  );
}
