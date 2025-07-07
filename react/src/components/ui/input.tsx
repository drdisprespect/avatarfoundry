import * as React from "react";

import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "apple-form-element flex h-11 w-full rounded-2xl border border-border/50 bg-card text-card-foreground backdrop-blur-sm px-4 py-2.5 text-sm font-medium shadow-sm transition-all duration-200 ease-apple file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-card-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:border-ring/50 focus-visible:shadow-lg focus-visible:shadow-ring/10 disabled:cursor-not-allowed disabled:opacity-50 hover:border-border hover:shadow-md",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
