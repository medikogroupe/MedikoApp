import Image from "next/image";

export function LogoIcon({
  size = 40,
  rounded = true,
}: {
  size?: number;
  rounded?: boolean;
}) {
  return (
    <Image
      src="/logo-icon.svg"
      alt="MEDIKO+"
      width={size}
      height={size}
      priority
      className={rounded ? "rounded-[10px]" : undefined}
    />
  );
}

export function LogoFull({
  variant = "color",
  height = 36,
}: {
  variant?: "color" | "white";
  height?: number;
}) {
  const width = Math.round((height * 460) / 130);
  return (
    <Image
      src={variant === "white" ? "/logo-white.svg" : "/logo.svg"}
      alt="MEDIKO+, Super App Étudiants Santé"
      width={width}
      height={height}
      priority
    />
  );
}

export default LogoFull;
