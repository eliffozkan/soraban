import type { SVGProps } from "react";

/** Simple original line icons (24 grid, 2px stroke, currentColor). Decorative by default. */
export type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Svg({ size = 20, children, ...rest }: IconProps) {
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
  );
}

export const IconPin = (p: IconProps) => (
  <Svg {...p}><path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Z" /><circle cx="12" cy="10" r="2.3" /></Svg>
);
export const IconCap = (p: IconProps) => (
  <Svg {...p}><path d="m2.5 9 9.5-4.5L21.5 9 12 13.5Z" /><path d="M6.5 11v4.5c1.5 1.4 3.5 2 5.5 2s4-.6 5.5-2V11" /></Svg>
);
export const IconBowl = (p: IconProps) => (
  <Svg {...p}><path d="M3.5 12h17a8.5 8.5 0 0 1-17 0Z" /><path d="M9 3.5c-1 1.2 1 2.3 0 3.5M12.5 3.5c-1 1.2 1 2.3 0 3.5M16 3.5c-1 1.2 1 2.3 0 3.5" /></Svg>
);
export const IconMuseum = (p: IconProps) => (
  <Svg {...p}><path d="M3 9.5 12 4l9 5.5Z" /><path d="M5 10v8M9.7 10v8M14.3 10v8M19 10v8M3 20.5h18" /></Svg>
);
export const IconWaves = (p: IconProps) => (
  <Svg {...p}><path d="M3 7.5c3-2 6 2 9 0s6-2 9 0M3 12.5c3-2 6 2 9 0s6-2 9 0M3 17.5c3-2 6 2 9 0s6-2 9 0" /></Svg>
);
export const IconAtom = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="1.6" />
    <ellipse cx="12" cy="12" rx="9.5" ry="3.8" />
    <ellipse cx="12" cy="12" rx="9.5" ry="3.8" transform="rotate(60 12 12)" />
    <ellipse cx="12" cy="12" rx="9.5" ry="3.8" transform="rotate(-60 12 12)" />
  </Svg>
);
export const IconLock = (p: IconProps) => (
  <Svg {...p}><rect x="5" y="10.5" width="14" height="10" rx="2.5" /><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" /></Svg>
);
export const IconCalculator = (p: IconProps) => (
  <Svg {...p}><rect x="5" y="3" width="14" height="18" rx="2.5" /><path d="M8.5 7h7M8.5 11.5h.01M12 11.5h.01M15.5 11.5h.01M8.5 15h.01M12 15h.01M15.5 15h.01M8.5 18h.01M12 18h.01M15.5 18h.01" /></Svg>
);
export const IconTrophy = (p: IconProps) => (
  <Svg {...p}><path d="M7.5 4h9v5a4.5 4.5 0 0 1-9 0Z" /><path d="M7.5 6H4.5a3 3 0 0 0 3 4M16.5 6h3a3 3 0 0 1-3 4M12 13.5V17M8.5 20h7M9.5 17h5v3h-5Z" /></Svg>
);
export const IconClose = (p: IconProps) => (
  <Svg {...p}><path d="M6 6l12 12M18 6 6 18" /></Svg>
);
export const IconBack = (p: IconProps) => (
  <Svg {...p}><path d="M15 5l-7 7 7 7" /></Svg>
);
export const IconArrowRight = (p: IconProps) => (
  <Svg {...p}><path d="M4 12h15M13 6l6 6-6 6" /></Svg>
);
export const IconBackspace = (p: IconProps) => (
  <Svg {...p}><path d="M8.5 5H20a1.5 1.5 0 0 1 1.5 1.5v11A1.5 1.5 0 0 1 20 19H8.5L2.5 12Z" /><path d="m11.5 9 5 6M16.5 9l-5 6" /></Svg>
);
export const IconCheck = (p: IconProps) => (
  <Svg {...p}><path d="m4.5 12.5 4.5 4.5 10.5-10.5" /></Svg>
);
