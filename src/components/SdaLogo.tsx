type SdaLogoProps = {
  size?: number;
  className?: string;
};

/** Official SDA logo asset is 1024×580 */
const ASPECT = 1024 / 580;

export function SdaLogo({ size = 120, className = '' }: SdaLogoProps) {
  const width = size;
  const height = Math.round(size / ASPECT);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logos/sda-logo.png"
      alt="Seventh-day Adventist Church"
      width={width}
      height={height}
      className={`shrink-0 rounded-md object-contain ${className}`.trim()}
      draggable={false}
    />
  );
}
