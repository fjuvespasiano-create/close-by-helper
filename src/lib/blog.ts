import { supabase } from "@/integrations/supabase/client";

export type BlogCategory = {
  id: string;
  slug: string;
  name: string;
  icon: string | null;
  color: string | null;
  sort: number;
};

export type BlogPostRow = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  cover_url: string | null;
  author_name: string | null;
  published_at: string | null;
  meta_description: string | null;
  keywords: string[] | null;
  post_type: "blog" | "news" | null;
  category_id: string | null;
  category_slug: string | null;
  category_name: string | null;
  category_color: string | null;
  category_icon: string | null;
};

export async function fetchBlogCategories(): Promise<BlogCategory[]> {
  const { data, error } = await supabase
    .from("blog_categories")
    .select("id, slug, name, icon, color, sort")
    .order("sort", { ascending: true });
  if (error) throw error;
  return (data ?? []) as BlogCategory[];
}

export async function fetchBlogPosts(opts?: { categorySlug?: string | null; type?: "blog" | "news" | null }) {
  let q = supabase
    .from("blog_posts")
    .select(
      "id, slug, title, excerpt, cover_url, author_name, published_at, meta_description, keywords, post_type, category_id, category_slug, category_name, category_color, category_icon",
    )
    .eq("published", true)
    .order("published_at", { ascending: false });
  if (opts?.categorySlug) q = q.eq("category_slug", opts.categorySlug);
  if (opts?.type) q = q.eq("post_type", opts.type);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as BlogPostRow[];
}

export async function fetchBlogPostBySlug(slug: string) {
  const { data, error } = await supabase
    .from("blog_posts")
    .select("*")
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle();
  if (error) throw error;
  return data;
}
