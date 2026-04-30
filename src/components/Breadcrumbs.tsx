import { ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";

export const Breadcrumbs = ({ items }: { items: { label: string; to?: string }[] }) => (
  <nav className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
    {items.map((it, i) => (
      <span key={i} className="flex items-center gap-1">
        {it.to ? (
          <Link to={it.to} className="hover:text-primary transition">
            {it.label}
          </Link>
        ) : (
          <span className="text-foreground font-medium">{it.label}</span>
        )}
        {i < items.length - 1 && <ChevronRight className="h-3.5 w-3.5" />}
      </span>
    ))}
  </nav>
);
