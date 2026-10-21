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
  width = 116,
  height = 24,
  className = '',
}: SocialityLogoProps) {
  const iconSize = Math.min(height, 28);
  const textSize = Math.max(13, Math.min(19, width / 7.5));

  return (
    <Link
      href={href}
      aria-label='Sociality home'
      className={`inline-flex shrink-0 items-center justify-center gap-[7px] font-sans text-white transition-opacity hover:opacity-85 focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#7F51F9] ${className}`}
    >
      <Image
        src='/assets/figma/icons/sociality_logo.png'
        alt=''
        width={iconSize}
        height={iconSize}
        priority
        className='shrink-0 object-contain'
      />

      <span
        className='whitespace-nowrap font-semibold tracking-[-0.035em]'
        style={{ fontSize: textSize }}
      >
        Sociality
      </span>
    </Link>
  );
}
