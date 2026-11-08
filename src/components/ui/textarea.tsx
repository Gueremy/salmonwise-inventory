import * as React from "react";
import { useEvidenceMode } from "@/privacy/EvidenceMode";

import { cn } from "@/lib/utils";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => {
  const { enabled } = useEvidenceMode();
  return (
    <div className="relative">
    <textarea
      style={enabled ? { color: "transparent", caretColor: "transparent" } : undefined}
      className={cn(
        "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      ref={ref}
      {...props}
    />
    {enabled && <span className="absolute inset-0 px-3 py-2 pointer-events-none text-sm bg-background rounded-md border">Texto protegido</span>}
    </div>
  );
});
Textarea.displayName = "Textarea";

export { Textarea };
