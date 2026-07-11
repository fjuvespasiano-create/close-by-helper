import { supabase } from "@/integrations/supabase/client";

export async function fetchBlogPosts() {
  const { data, error } = await supabase
    .from("blog_posts")
    .select("id, slug, title, excerpt, cover_url, author_name, published_at, meta_description, keywords")
    .eq("published", true)
    .order("published_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
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
