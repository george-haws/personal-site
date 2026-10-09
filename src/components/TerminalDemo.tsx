import { Fragment } from "react";
import type { DemoLine, DemoSpan } from "@/lib/types";

const styles: Record<NonNullable<DemoSpan["style"]>, string> = {
  name: "font-semibold text-foreground",
  dim: "text-muted-foreground",
  label: "text-primary",
  italic: "italic",
};

/** Sample terminal output, one span per styled run, rendered in the site's theme colors. */
export function TerminalDemo({ lines }: { lines: DemoLine[] }) {
  return (
    <pre
      role="figure"
      className="overflow-x-auto border-y border-border bg-muted px-4 py-3 font-mono text-xs leading-relaxed"
    >
      {lines.map((line, i) => (
        <Fragment key={i}>
          {i > 0 ? "\n" : null}
          {line.map((span, j) => (
            <span key={j} className={span.style ? styles[span.style] : ""}>
              {span.text}
            </span>
          ))}
        </Fragment>
      ))}
    </pre>
  );
}
