import Image from "next/image";
import onLight from "../../public/brand/sellycat-on-light-1024.png";
import onDark from "../../public/brand/sellycat-on-dark-1024.png";
import icon from "../../public/brand/sellycat-icon-coral-256.png";

/**
 * Sellycat logo per the brand kit: the on-light file on light grounds, the on-dark file on dark
 * grounds (never inverted). Below 160 px width the brand kit asks for the icon instead.
 */
export function Logo({ width = 180, priority = false, className = "" }: { width?: number; priority?: boolean; className?: string }) {
  if (width < 160) return <LogoIcon size={Math.round(width / 3)} className={className} />;
  const height = Math.round((width * onLight.height) / onLight.width);
  return (
    <span className={`inline-block ${className}`} style={{ width, height }}>
      <Image src={onLight} alt="Sellycat" width={width} height={height} priority={priority} className="block dark:hidden" />
      <Image src={onDark} alt="Sellycat" width={width} height={height} priority={priority} className="hidden dark:block" />
    </span>
  );
}

export function LogoIcon({ size = 32, className = "" }: { size?: number; className?: string }) {
  const height = Math.round((size * icon.height) / icon.width);
  return <Image src={icon} alt="Sellycat" width={size} height={height} className={className} />;
}
