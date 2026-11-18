export default function StatusPill({ status, label }) {
  const text = label ?? (status === 'operational' ? 'Operational' : status === 'warning' ? 'Degraded' : 'Critical');
  return (
    <span className={`status-pill status-${status}`}>
      <span className="status-dot" aria-hidden="true" />
      {text}
    </span>
  );
}
