import Link from "next/link";
import { formatDate } from "@/lib/dates";
import type { Post } from "@/lib/types";

export function PostListItem({ post }: { post: Post }) {
  return (
    <li className="flex flex-col gap-1">
      <Link href={`/writing/${post.slug}`} className="font-medium text-primary hover:underline">
        {post.title}
      </Link>
      <time dateTime={post.published} className="text-xs text-muted-foreground">
        {formatDate(post.published)}
      </time>
      <p className="max-w-prose text-sm text-muted-foreground">{post.description}</p>
    </li>
  );
}
