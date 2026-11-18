const strokeProps = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

const PATHS = {
  overview: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </>
  ),
  network: (
    <>
      <circle cx="5" cy="6" r="2" />
      <circle cx="19" cy="6" r="2" />
      <circle cx="12" cy="18" r="2" />
      <path d="M7 6h10M6.1 7.7l4.9 8.5M17.9 7.7 13 16.2" />
    </>
  ),
  lab: (
    <>
      <path d="M9 3h6M10 3v6.2L4.7 18a2 2 0 0 0 1.7 3h11.2a2 2 0 0 0 1.7-3L14 9.2V3" />
      <path d="M7 15h10" />
    </>
  ),
  compare: (
    <>
      <path d="M4 20V9M10 20V4M16 20v-7M22 20H2" />
    </>
  ),
  history: (
    <>
      <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
      <path d="M3 3v5h5M12 7v5l3.2 2" />
    </>
  ),
  docs: (
    <>
      <path d="M6 3h8l4 4v14H6z" />
      <path d="M14 3v4h4M9 12h6M9 16h6" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </>
  ),
  play: <path d="M7 4.5v15l13-7.5z" />,
  pause: (
    <>
      <path d="M8 4v16M16 4v16" strokeWidth="2.4" />
    </>
  ),
  step: (
    <>
      <path d="M5 5v14l10-7z" />
      <path d="M19 5v14" />
    </>
  ),
  reset: (
    <>
      <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
      <path d="M3 3v5h5" />
    </>
  ),
  save: (
    <>
      <path d="M5 3h11l3 3v15H5z" />
      <path d="M8 3v6h7V3M8 21v-7h8v7" />
    </>
  ),
  menu: <path d="M3 6h18M3 12h18M3 18h18" />,
  close: <path d="M5 5l14 14M19 5 5 19" />,
  chevron: <path d="M8 10l4 4 4-4" />,
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  bolt: <path d="M13 2 4 14h6l-1 8 9-12h-6z" />,
  droplet: <path d="M12 2.5S5.5 9 5.5 14a6.5 6.5 0 0 0 13 0C18.5 9 12 2.5 12 2.5z" />,
  signal: (
    <>
      <path d="M4.5 8.5a11 11 0 0 1 15 0M7.5 12a6.8 6.8 0 0 1 9 0M10.4 15.4a2.7 2.7 0 0 1 3.2 0" />
      <circle cx="12" cy="19" r="0.9" fill="currentColor" stroke="none" />
    </>
  ),
  truck: (
    <>
      <path d="M3 6h11v10H3zM14 9h4l3 3v4h-7" />
      <circle cx="7" cy="18" r="2" />
      <circle cx="17.5" cy="18" r="2" />
    </>
  ),
  hospital: (
    <>
      <path d="M4 21V8l8-4 8 4v13M9 21v-5h6v5" />
      <path d="M12 7v5M9.5 9.5h5" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3 4.5 6v5.5c0 4.6 3.1 7.9 7.5 9.5 4.4-1.6 7.5-4.9 7.5-9.5V6z" />
      <path d="M9 12l2 2 4-4" />
    </>
  ),
  alert: (
    <>
      <path d="M12 3 2.7 20h18.6z" />
      <path d="M12 9v5M12 17.2v.1" />
    </>
  ),
  check: <path d="M4 12.5 9 17 20 6" />,
  plus: <path d="M12 5v14M5 12h14" />,
  trash: (
    <>
      <path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14M10 11v6M14 11v6" />
    </>
  ),
  sliders: (
    <>
      <path d="M4 6h10M18 6h2M4 12h2M10 12h10M4 18h8M16 18h4" />
      <circle cx="16" cy="6" r="2" />
      <circle cx="8" cy="12" r="2" />
      <circle cx="14" cy="18" r="2" />
    </>
  ),
  external: (
    <>
      <path d="M14 4h6v6M20 4l-9 9" />
      <path d="M19 14v6H4V5h6" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v6M12 7.5v.1" />
    </>
  ),
};

export default function Icon({ name, size = 16, className = '', title }) {
  const content = PATHS[name] ?? PATHS.overview;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      className={`icon ${className}`.trim()}
      {...strokeProps}
    >
      {title ? <title>{title}</title> : null}
      {content}
    </svg>
  );
}
