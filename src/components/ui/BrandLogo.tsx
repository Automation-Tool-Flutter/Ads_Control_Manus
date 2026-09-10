import Image from 'next/image';

export function BrandLogo({ size = 40, decorative = false }: { size?: number; decorative?: boolean }) {
  return (
    <Image
      src="/meta-ads-ai.png"
      alt={decorative ? '' : 'Meta Ads AI'}
      width={size}
      height={size}
      unoptimized
      className="shrink-0 object-contain"
    />
  );
}
