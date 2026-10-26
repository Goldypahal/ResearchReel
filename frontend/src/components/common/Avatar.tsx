import Image from 'next/image';
import { cn } from '@/lib/utils';

const SIZES = { xs: 24, sm: 32, md: 40, lg: 56, xl: 96 } as const;

interface AvatarProps {
  src?: string | null;
  name?: string | null;
  size?: keyof typeof SIZES;
  className?: string;
  ring?: boolean;
}

/** Photo when the user has one, otherwise a stable colour + initial. */
export default function Avatar({ src, name, size = 'md', className, ring }: AvatarProps) {
  const px = SIZES[size];
  const label = (name || '?').trim();
  const hue = [...label].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7);
  return (
    <div
      className={cn(
        'relative shrink-0 overflow-hidden rounded-full flex items-center justify-center font-bold text-white select-none',
        ring && 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-[var(--background)]',
        className
      )}
      style={{ width: px, height: px, background: src ? undefined : `linear-gradient(135deg, hsl(${hue} 70% 45%), hsl(${(hue + 50) % 360} 70% 35%))`, fontSize: Math.max(10, px * 0.4) }}
      aria-hidden={!name}
    >
      {src ? (
        <Image src={src} alt={name || 'avatar'} width={px} height={px} className="h-full w-full object-cover" />
      ) : (
        label.charAt(0).toUpperCase()
      )}
    </div>
  );
}
