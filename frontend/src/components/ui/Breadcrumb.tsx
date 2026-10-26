import React from "react";
import { Link } from "react-router-dom";
import { CaretRight, House } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

export interface BreadcrumbItem {
  label: string;
  href?: string;
  isCurrent?: boolean;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({ items, className }) => {
  return (
    <nav aria-label="Breadcrumb" className={cn("flex items-center text-xs", className)}>
      <ol className="flex items-center gap-1.5 text-content-secondary">
        <li>
          <Link
            to="/"
            className="flex items-center text-content-muted hover:text-content-primary transition-colors p-0.5 rounded focus-visible:ring-1"
            aria-label="Home"
          >
            <House size={14} />
          </Link>
        </li>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={index} className="flex items-center gap-1.5">
              <CaretRight size={12} className="text-content-muted flex-shrink-0" />
              {item.href && !isLast ? (
                <Link
                  to={item.href}
                  className="hover:text-content-primary transition-colors font-medium truncate max-w-[150px] sm:max-w-none"
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  className={cn(
                    "font-semibold truncate max-w-[180px] sm:max-w-none",
                    isLast ? "text-content-primary" : "text-content-secondary"
                  )}
                  aria-current={isLast ? "page" : undefined}
                >
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};
