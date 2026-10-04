import Image from 'next/image';

export function BrandLogo({ size = 40, decorative = false, src = '/meta-ads-ai.png' }: { size?: number; decorative?: boolean; src?: string }) {
  return (
    <Image
      src={src}
      alt={decorative ? '' : 'Meta AI Ads'}
      width={size}
      height={size}
      unoptimized
      className="shrink-0 object-contain"
    />
  );
}
