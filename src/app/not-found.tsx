import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <>
      <h1>Page not found</h1>
      <p>There is nothing at this address.</p>
      <p>
        <Link href="/">Back to the home page</Link>
      </p>
    </>
  );
}
