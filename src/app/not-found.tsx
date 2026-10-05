import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <>
      <h1 className="text-2xl font-semibold text-foreground before:mr-2 before:text-primary before:content-['$']">
        Page not found
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">There is nothing at this address.</p>
      <p className="mt-3">
        <Link href="/" className="text-sm text-primary hover:underline">
          Back to the home page
        </Link>
      </p>
    </>
  );
}
