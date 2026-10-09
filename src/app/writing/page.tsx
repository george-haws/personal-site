import type { Metadata } from "next";
import { PostListItem } from "@/components/PostListItem";
import { posts } from "@/data/posts";

export const metadata: Metadata = {
  title: "Writing",
  description: "Posts on engineering, validation, and AI-driven development.",
};

export default function WritingPage() {
  const sorted = [...posts].sort((a, b) => b.published.localeCompare(a.published));

  return (
    <>
      <h1 className="text-2xl font-semibold text-foreground before:mr-2 before:text-primary before:content-['$']">
        Writing
      </h1>
      <ul className="mt-6 flex flex-col gap-6">
        {sorted.map((post) => (
          <PostListItem key={post.slug} post={post} />
        ))}
      </ul>
    </>
  );
}
