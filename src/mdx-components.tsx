import type { MDXComponents } from "mdx/types";
import type { ComponentPropsWithoutRef } from "react";
import { ScrollRegion } from "@/components/ScrollRegion";

const components = {
  h2: (props: ComponentPropsWithoutRef<"h2">) => (
    <h2
      className="mt-10 text-lg font-medium text-foreground before:mr-2 before:text-primary before:content-['#']"
      {...props}
    />
  ),
  p: (props: ComponentPropsWithoutRef<"p">) => (
    <p className="mt-4 max-w-prose text-sm leading-relaxed" {...props} />
  ),
  strong: (props: ComponentPropsWithoutRef<"strong">) => (
    <strong className="font-semibold text-foreground" {...props} />
  ),
  // Links inside running prose stay underlined: colour alone does not mark them (WCAG 1.4.1).
  a: (props: ComponentPropsWithoutRef<"a">) => (
    <a className="text-primary underline underline-offset-4" {...props} />
  ),
  ol: (props: ComponentPropsWithoutRef<"ol">) => (
    <ol className="mt-4 max-w-prose list-decimal space-y-2 pl-6" {...props} />
  ),
  li: (props: ComponentPropsWithoutRef<"li">) => (
    <li className="text-sm leading-relaxed" {...props} />
  ),
  table: (props: ComponentPropsWithoutRef<"table">) => (
    <div className="mt-6">
      <ScrollRegion label="Scrollable table">
        <table className="w-full border-collapse text-sm" {...props} />
      </ScrollRegion>
    </div>
  ),
  th: (props: ComponentPropsWithoutRef<"th">) => (
    <th
      className="border border-border bg-muted px-3 py-2 text-left align-top font-medium text-muted-foreground"
      {...props}
    />
  ),
  td: (props: ComponentPropsWithoutRef<"td">) => (
    <td className="border border-border px-3 py-2 align-top" {...props} />
  ),
} satisfies MDXComponents;

export function useMDXComponents() {
  return components;
}
