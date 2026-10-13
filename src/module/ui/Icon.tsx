// Chỉ giữ icon chức năng — không dùng icon trang trí.
const paths = {
  x: 'M4 4l8 8M12 4l-8 8',
  link: 'M6.5 9.5l3-3M7 4.5l1-1a2.5 2.5 0 013.5 3.5l-1 1M9 11.5l-1 1A2.5 2.5 0 014.5 9l1-1',
  grip: 'M6 4h.01M10 4h.01M6 8h.01M10 8h.01M6 12h.01M10 12h.01',
  chevron: 'M4.5 6.5L8 10l3.5-3.5',
  left: 'M9.5 4L5.5 8l4 4',
  right: 'M6.5 4l4 4-4 4',
  plus: 'M8 3.5v9M3.5 8h9',
  download: 'M8 3v7m0 0l-3-3m3 3l3-3M3.5 12.5h9',
  file: 'M9 2.5H5a1 1 0 00-1 1v9a1 1 0 001 1h6a1 1 0 001-1V5.5L9 2.5zM9 2.5v3h3',
  external: 'M9.5 3.5h3v3M12.5 3.5L7.5 8.5M11 9.5v2.5a.5.5 0 01-.5.5h-6a.5.5 0 01-.5-.5v-6a.5.5 0 01.5-.5H7',
  trash: 'M3.5 4.5h9M6.5 4.5V3h3v1.5M5 4.5l.5 8h5l.5-8',
} as const;

export type IconName = keyof typeof paths;

export function Icon({ name, size = 14, className = '' }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={name === 'grip' ? 2.4 : 1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`tm-shrink-0 ${className}`}
      aria-hidden
    >
      <path d={paths[name]} />
    </svg>
  );
}
