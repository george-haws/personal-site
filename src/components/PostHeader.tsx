import { formatDate } from "@/lib/dates";
import type { Post } from "@/lib/types";

export function PostHeader({ post }: { post: Post }) {
  return (
    <hgroup className="flex flex-col gap-1">
      <h1 className="text-2xl font-semibold text-foreground before:mr-2 before:text-primary before:content-['$']">
        {post.title}
      </h1>
      <time dateTime={post.published} className="text-sm text-muted-foreground">
        {formatDate(post.published)}
      </time>
    </hgroup>
  );
}
