/** Decorative boulevard scene: trees, a kiosk, a tower and a walking path. */
export function Hero() {
  return (
    <svg className="hero" viewBox="0 0 360 150" role="presentation" aria-hidden="true" focusable="false">
      <rect width="360" height="150" fill="var(--sky)" />
      <circle cx="300" cy="38" r="18" fill="var(--sun)" />
      {/* skyline */}
      <g fill="var(--skyline)">
        <rect x="40" y="40" width="26" height="70" rx="2" />
        <rect x="70" y="62" width="34" height="48" rx="2" />
        <rect x="232" y="56" width="30" height="54" rx="2" />
        <rect x="266" y="72" width="40" height="38" rx="2" />
      </g>
      <g fill="var(--sky)" opacity="0.7">
        <rect x="46" y="48" width="5" height="6" />
        <rect x="55" y="48" width="5" height="6" />
        <rect x="46" y="60" width="5" height="6" />
        <rect x="55" y="60" width="5" height="6" />
        <rect x="46" y="72" width="5" height="6" />
        <rect x="55" y="72" width="5" height="6" />
      </g>
      {/* ground */}
      <path d="M0 108 Q180 96 360 108 V150 H0 Z" fill="var(--grass)" />
      <path d="M0 126 Q180 112 360 126 V150 H0 Z" fill="var(--path)" />
      <path
        d="M14 136 Q120 120 200 130 T346 128"
        fill="none"
        stroke="var(--trail)"
        strokeWidth="3"
        strokeDasharray="8 7"
        strokeLinecap="round"
      />
      {/* trees */}
      {[24, 128, 200, 326].map((x) => (
        <g key={x}>
          <rect x={x - 2} y="88" width="4" height="22" fill="var(--trunk)" />
          <circle cx={x} cy="80" r="15" fill="var(--leaf)" />
          <circle cx={x + 8} cy="88" r="9" fill="var(--leaf-2)" />
        </g>
      ))}
      {/* kiosk */}
      <g>
        <rect x="150" y="84" width="34" height="26" fill="var(--kiosk)" />
        <path d="M144 84 L167 68 L190 84 Z" fill="var(--roof)" />
        <rect x="160" y="94" width="14" height="16" fill="var(--sky)" />
      </g>
      {/* pin */}
      <g transform="translate(96 80)">
        <path d="M10 28s-9-8.5-9-15a9 9 0 0118 0c0 6.5-9 15-9 15z" fill="var(--accent)" />
        <circle cx="10" cy="13" r="3.5" fill="var(--sky)" />
      </g>
    </svg>
  )
}
