export default function Brand({ compact = false }) {
  return (
    <div className="brand" aria-label="NEXUS Chaos Engine">
      <svg className="brand-mark" viewBox="0 0 32 32" role="img" aria-label="NEXUS node-network mark">
        <path d="M8 9v14M8 9l16 14M24 9v14" stroke="currentColor" strokeWidth="1.5" fill="none" />
        <circle cx="8" cy="9" r="2.6" fill="#0B0E11" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="24" cy="9" r="2.6" fill="#0B0E11" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="8" cy="23" r="2.6" fill="#0B0E11" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="24" cy="23" r="2.6" fill="#0B0E11" stroke="#E5AA54" strokeWidth="1.5" />
      </svg>
      {!compact && (
        <span className="brand-text">
          <span className="brand-name">NEXUS</span>
          <span className="brand-module">CHAOS ENGINE</span>
        </span>
      )}
    </div>
  );
}
