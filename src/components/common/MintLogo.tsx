export function MintLogo({ size = 30 }: { size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.32,
        flex: '0 0 auto',
        background: 'linear-gradient(145deg, oklch(0.74 0.12 168), oklch(0.6 0.12 178))',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 3px 8px oklch(0.6 0.1 170 / 0.32)',
      }}
    >
      <svg
        width={size * 0.56}
        height={size * 0.56}
        viewBox="0 0 24 24"
        fill="none"
        stroke="#fff"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 3l1.8 5L19 9.5 14.5 13 16 18l-4-3-4 3 1.5-5L5 9.5 10.2 8 12 3z" />
      </svg>
    </div>
  )
}
