const ICONS: Record<string, string> = {
  dashboard: 'M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z',
  shield: 'M12 3l7 3v6c0 4.4-3 8.3-7 9.5C8 20.3 5 16.4 5 12V6l7-3z',
  sparkles: 'M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3z',
  feed: 'M4 11a9 9 0 019 9M4 4a16 16 0 0116 16M5 19a1.5 1.5 0 100-3 1.5 1.5 0 000 3z',
  doc: 'M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9l-6-6zM14 3v6h6M8 13h8M8 17h6',
  search: 'M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4.3-4.3',
  ext: 'M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3',
  clock: 'M12 22a10 10 0 100-20 10 10 0 000 20zM12 6v6l4 2',
  check: 'M20 6L9 17l-5-5',
  chevR: 'M9 18l6-6-6-6',
  chevD: 'M6 9l6 6 6-6',
  arrowUp: 'M12 19V5M5 12l7-7 7 7',
  arrowRight: 'M5 12h14M12 5l7 7-7 7',
  plus: 'M12 5v14M5 12h14',
  refresh: 'M3 12a9 9 0 019-9 9 9 0 016.7 3M21 4v5h-5M21 12a9 9 0 01-9 9 9 9 0 01-6.7-3M3 20v-5h5',
  slack: 'M9 14a2 2 0 11-4 0 2 2 0 012-2h2v2zM10 14a2 2 0 014 0v5a2 2 0 01-4 0v-5z',
  alert: 'M12 9v4M12 17h.01M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z',
  x: 'M18 6L6 18M6 6l12 12',
  logout: 'M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9',
  inbox: 'M22 12h-6l-2 3h-4l-2-3H2M5.5 5h13l3.5 7v6a2 2 0 01-2 2H4a2 2 0 01-2-2v-6l3.5-7z',
  trash: 'M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m2 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6',
  promote: 'M12 19V5M5 12l7-7 7 7',
  eye: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z M12 15a3 3 0 100-6 3 3 0 000 6z',
  menu: 'M4 7h16M4 12h16M4 17h16',
  help: 'M12 22a10 10 0 100-20 10 10 0 000 20zM9.5 9.5a2.5 2.5 0 115 0 2.5 2.5M12 17h.01',
}

interface IconProps {
  name: keyof typeof ICONS | string
  className?: string
  style?: React.CSSProperties
}

export function Icon({ name, className, style }: IconProps) {
  const d = ICONS[name] || ICONS.sparkles
  const fillIcons = ['dashboard']
  if (fillIcons.includes(name)) {
    return (
      <svg className={className} style={style} viewBox="0 0 24 24" fill="currentColor">
        <path d={d} />
      </svg>
    )
  }
  return (
    <svg
      className={className}
      style={style}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={d} />
    </svg>
  )
}
