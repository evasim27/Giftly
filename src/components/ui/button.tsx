import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";
type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean; variant?: "default" | "outline" | "ghost" | "danger"; size?: "default" | "sm" | "lg" };
export function Button({ className, asChild = false, variant = "default", size = "default", ...props }: Props) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn("inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold tracking-[.01em] transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage-600 disabled:pointer-events-none disabled:opacity-50", variant === "default" && "bg-foreground text-white hover:bg-sage-700", variant === "outline" && "border border-border bg-white text-foreground hover:border-sage-400 hover:bg-sage-50", variant === "ghost" && "text-foreground hover:bg-sage-50", variant === "danger" && "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100", size === "sm" && "h-9 px-3", size === "default" && "h-11 px-5", size === "lg" && "h-12 px-6 text-sm", className)} {...props} />;
}
