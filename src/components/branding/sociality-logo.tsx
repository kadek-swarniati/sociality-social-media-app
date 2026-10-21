import Image from 'next/image';
import Link from 'next/link';

type SocialityLogoProps = {
  href?: string;
  width?: number;
  height?: number;
  className?: string;
};

export default function SocialityLogo({
  href = '/feed',
  width = 72,
  height = 21,
  className = '',
}: SocialityLogoProps) {
  return (
    <Link
      href={href}
      aria-label='Sociality home'
      className={`inline-flex shrink-0 items-center gap-1.5 ${className}`}
    >
      <Image
        src='/assets/figma/icons/sociality_logo.png'
        alt=''
        width={height}
        height={height}
        priority
        unoptimized
        className='shrink-0 object-contain'
      />

      <span
        className='font-semibold tracking-tight text-white'
        style={{ fontSize: `${Math.max(11, width / 6.5)}px` }}
      >
        Sociality
      </span>
    </Link>
  );
}
