import type { ButtonHTMLAttributes, ReactNode } from "react";

type KeycapProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: ReactNode;
  variant?: "round" | "pill" | "bar";
  size?: "sm" | "md" | "lg";
  latched?: boolean;
  className?: string;
};

export function Keycap({
  label,
  variant = "round",
  size = "md",
  latched = false,
  className = "",
  ...rest
}: KeycapProps) {
  return (
    <button
      type="button"
      className={`keycap ${variant} ${size}${latched ? " latched" : ""} ${className}`.trim()}
      {...rest}
    >
      {label}
    </button>
  );
}
