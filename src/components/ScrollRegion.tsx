"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Horizontal scroll container that keyboards can reach, assistive tech can name,
 * and that fades its trailing edge while more content sits off to the right.
 * Children should size to their content (`w-max min-w-full`) so the fade and
 * background track the scrolled width rather than the viewport.
 */
export function ScrollRegion({ label, children }: { label: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [overflow, setOverflow] = useState(false);

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setOverflow(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }, []);

  useEffect(() => {
    measure();
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    // Watch the child too: a font swap changes content width without resizing the region.
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    if (el.firstElementChild) observer.observe(el.firstElementChild);
    return () => observer.disconnect();
  }, [measure]);

  return (
    <div className="relative">
      <div
        ref={ref}
        role="region"
        aria-label={label}
        tabIndex={0}
        data-overflow={overflow}
        onScroll={measure}
        className="overflow-x-auto outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
      >
        {children}
      </div>
      <div
        aria-hidden="true"
        data-slot="scroll-fade"
        className={cn(
          "pointer-events-none absolute inset-y-px right-0 w-10 bg-linear-to-l from-muted to-transparent transition-opacity",
          overflow ? "opacity-100" : "opacity-0",
        )}
      />
    </div>
  );
}
