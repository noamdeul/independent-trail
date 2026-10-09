import type { ReactNode, SVGProps } from 'react'
import type { StationIcon } from '../content'

type IconProps = SVGProps<SVGSVGElement> & { size?: number }

function Svg({ size = 24, children, ...rest }: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  )
}

export const IconWalk = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="13" cy="4" r="2" />
    <path d="M10 22l2-7 3 3v6M8 12l2-4 4 1 2 4 3 1M10 8l-2 6" />
  </Svg>
)
export const IconList = (p: IconProps) => (
  <Svg {...p}>
    <path d="M9 6h11M9 12h11M9 18h11" />
    <circle cx="4.5" cy="6" r="1" />
    <circle cx="4.5" cy="12" r="1" />
    <circle cx="4.5" cy="18" r="1" />
  </Svg>
)
export const IconFlag = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 21V4M5 4h11l-2 4 2 4H5" />
  </Svg>
)
export const IconInfo = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v6M12 7.5v.5" />
  </Svg>
)
export const IconCheck = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </Svg>
)
export const IconSkip = (p: IconProps) => (
  // Points left: "forward" in RTL.
  <Svg {...p}>
    <path d="M13 6l-6 6 6 6M19 6l-6 6 6 6" />
  </Svg>
)
export const IconSwap = (p: IconProps) => (
  <Svg {...p}>
    <path d="M7 4L4 7l3 3M4 7h13M17 20l3-3-3-3M20 17H7" />
  </Svg>
)
export const IconCompass = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M15.5 8.5l-2 5-5 2 2-5z" />
  </Svg>
)
export const IconBook = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 6c-2-1.5-5-2-8-1.5v14c3-.5 6 0 8 1.5 2-1.5 5-2 8-1.5v-14c-3-.5-6 0-8 1.5zM12 6v14" />
  </Svg>
)
export const IconPin = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0113 0c0 5-6.5 11-6.5 11z" />
    <circle cx="12" cy="10" r="2.3" />
  </Svg>
)
export const IconBulb = (p: IconProps) => (
  <Svg {...p}>
    <path d="M9 18h6M10 21h4M12 3a6 6 0 00-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0012 3z" />
  </Svg>
)
export const IconEye = (p: IconProps) => (
  <Svg {...p}>
    <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
    <circle cx="12" cy="12" r="2.8" />
  </Svg>
)
export const IconDownload = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 4v11M7 10.5l5 5 5-5M5 20h14" />
  </Svg>
)
export const IconWater = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3s6 6.5 6 11a6 6 0 01-12 0c0-4.5 6-11 6-11z" />
  </Svg>
)
export const IconHat = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 17c3 1.5 15 1.5 18 0M6 16.5c0-6 2.5-9.5 6-9.5s6 3.5 6 9.5" />
  </Svg>
)
export const IconPhone = (p: IconProps) => (
  <Svg {...p}>
    <rect x="7" y="2.5" width="10" height="19" rx="2" />
    <path d="M11 18.5h2M10 10h4v4h-4z" />
  </Svg>
)
export const IconClock = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </Svg>
)
export const IconTree = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 21v-6M12 3a5 5 0 00-5 5 4 4 0 00.5 7h9A4 4 0 0017 8a5 5 0 00-5-5z" />
  </Svg>
)
export const IconWarning = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3.5L2.5 20h19L12 3.5zM12 10v4.5M12 17.2v.3" />
  </Svg>
)
export const IconHeart = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 20s-7.5-4.5-7.5-10A4.5 4.5 0 0112 7a4.5 4.5 0 017.5 3c0 5.5-7.5 10-7.5 10z" />
  </Svg>
)
export const IconIceCream = (p: IconProps) => (
  <Svg {...p}>
    <path d="M7.5 10a4.5 4.5 0 019 0M7 10h10l-5 11z" />
  </Svg>
)
export const IconRefresh = (p: IconProps) => (
  <Svg {...p}>
    <path d="M20 12a8 8 0 11-2.3-5.6M20 4v5h-5" />
  </Svg>
)
export const IconExternal = (p: IconProps) => (
  <Svg {...p}>
    <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1h5" />
  </Svg>
)

const stationPaths: Record<StationIcon, ReactNode> = {
  kiosk: (
    <>
      <path d="M4 9l1.5-4h13L20 9M4 9h16M4 9c0 1.4 1.2 2 2.7 2s2.6-.6 2.6-2c0 1.4 1.2 2 2.7 2s2.7-.6 2.7-2c0 1.4 1.1 2 2.6 2S20 10.4 20 9" />
      <path d="M5.5 11v9h13v-9M10 20v-5h4v5" />
    </>
  ),
  fountain: (
    <>
      <path d="M3 17h18M5 17l1 4h12l1-4" />
      <path d="M12 17V9M12 9c-1.5-3-4-4-6-3M12 9c1.5-3 4-4 6-3" />
      <path d="M9 17v-2h6v2" />
    </>
  ),
  house: (
    <>
      <path d="M3.5 11L12 4l8.5 7M5.5 9.5V20h13V9.5" />
      <path d="M10 20v-5h4v5M8 12h2M14 12h2" />
    </>
  ),
  tower: (
    <>
      <path d="M8 21V4h8v17M5 21h14" />
      <path d="M10.5 7h3M10.5 10h3M10.5 13h3M10.5 16h3" />
    </>
  ),
  monument: (
    <>
      <path d="M4 21h16M6 21v-3h12v3M8 18V8l4-4 4 4v10" />
      <path d="M10.5 11h3M10.5 14h3" />
    </>
  ),
  horse: (
    <>
      <path d="M6 20v-5c0-3 2-5.5 5-6l2-4 1.5 2.5L18 9l-1 2.5-2.5-.5-1 3.5V20" />
      <path d="M9 20v-4M4 21h16" />
    </>
  ),
  hall: (
    <>
      <path d="M3 9.5L12 4l9 5.5M4.5 9.5h15M5 20h14M3.5 21h17" />
      <path d="M7 12v6M10.3 12v6M13.7 12v6M17 12v6" />
    </>
  ),
}

export function StationGlyph({ icon, ...p }: IconProps & { icon: StationIcon }) {
  return <Svg {...p}>{stationPaths[icon]}</Svg>
}
