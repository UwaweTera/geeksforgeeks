interface LogoProps {
  wordmark?: boolean
  full?: boolean
  size?: number
  light?: boolean
}

/** Official GeeksforGeeks GG mark — uses the real logo image. */
export function Logo({ wordmark = false, full = false, size = 36, light = false }: LogoProps) {
  const green = '#2f8d46'
  const textCol = light ? '#ffffff' : '#1f2937'
  const subCol = light ? 'rgba(255,255,255,0.55)' : '#6b7280'
  const height = size
  const width = Math.round(size * 1.72)

  const icon = (
    <img
      src="/gfg-logo.png?v=2"
      alt="GeeksforGeeks"
      className="gfg-mark"
      width={width}
      height={height}
      decoding="async"
    />
  )

  if (!wordmark && !full) return icon

  const nameSize = Math.max(13, Math.round(size * 0.42))
  const nameEl = (
    <span className="gfg-wordmark" style={{
      fontSize: nameSize,
      fontWeight: 800,
      fontFamily: "'Segoe UI', system-ui, Arial, sans-serif",
      letterSpacing: '-0.3px',
      lineHeight: 1,
      whiteSpace: 'nowrap',
      userSelect: 'none',
    }}>
      <span style={{ color: green }}>Geeks</span>
      <span style={{ color: textCol }}>for</span>
      <span style={{ color: green }}>Geeks</span>
    </span>
  )

  if (wordmark && !full) {
    return <span className="gfg-logo with-word">{icon}{nameEl}</span>
  }

  return (
    <span className="gfg-logo with-word">
      {icon}
      <span style={{ display: 'flex', flexDirection: 'column', gap: 3, lineHeight: 1.15 }}>
        {nameEl}
        <span style={{ fontSize: Math.round(size * 0.24), color: subCol, fontWeight: 500 }}>
          Sanchhaya Education Pvt. Ltd.
        </span>
      </span>
    </span>
  )
}
