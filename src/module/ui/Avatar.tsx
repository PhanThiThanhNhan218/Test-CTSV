import type { Member } from '../types';

const PALETTE = ['#e0e7ff', '#fce7f3', '#dcfce7', '#fef3c7', '#e0f2fe', '#f3e8ff'];
const INK = ['#3730a3', '#9d174d', '#166534', '#92400e', '#075985', '#6b21a8'];

export function Avatar({ member, size = 20 }: { member?: Member; size?: number }) {
  if (!member) return null;
  const i = Number(member.id.replace(/\D/g, '')) % PALETTE.length;
  return (
    <span
      title={member.name}
      className="tm-inline-flex tm-shrink-0 tm-select-none tm-items-center tm-justify-center tm-rounded-full tm-font-semibold"
      style={{ width: size, height: size, fontSize: size <= 20 ? 9 : 10, background: PALETTE[i], color: INK[i] }}
    >
      {member.initials}
    </span>
  );
}
