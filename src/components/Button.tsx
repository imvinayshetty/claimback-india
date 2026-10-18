import type { ButtonHTMLAttributes } from "react";

export function Button({ className = "btn btn-primary", ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={className} {...props} />;
}