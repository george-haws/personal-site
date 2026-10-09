import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PostHeader } from "@/components/PostHeader";
import { posts } from "@/data/posts";

type Params = { slug: string };

export const dynamicParams = false;

export function generateStaticParams(): Params[] {
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const post = posts.find((p) => p.slug === slug);
  if (!post) return {};
  return { title: post.title, description: post.description };
}

export default async function PostPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const post = posts.find((p) => p.slug === slug);
  if (!post) notFound();

  const { default: Body } = await import(`@/content/writing/${slug}.mdx`);

  return (
    <article>
      <PostHeader post={post} />
      <div className="mt-8">
        <Body />
      </div>
    </article>
  );
}
