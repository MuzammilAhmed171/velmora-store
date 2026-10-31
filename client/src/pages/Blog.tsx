import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { api } from "../lib/api";
import { useStore } from "../context/Store";
import { EmptyState, PageHeader, Stagger, StaggerItem, Skeleton } from "../components/ui";

export function Blog() {
  const { tr } = useStore();
  const [posts, setPosts] = useState<any[] | null>(null);
  useEffect(() => { api("/blog").then((d: any) => setPosts(d.posts)).catch(() => setPosts([])); }, []);
  return (
    <div className="max-w-5xl mx-auto px-4 mt-6">
      <PageHeader title={tr("blog")} sub="Stories, guides and shopping tips from the Velmora team" />
      {posts === null ? (
        <div className="grid md:grid-cols-2 gap-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card overflow-hidden"><Skeleton className="h-44 !rounded-none" /><div className="p-4 space-y-2"><Skeleton className="h-5 w-3/4" /><Skeleton className="h-3 w-full" /></div></div>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <EmptyState title="No posts yet" hint="Our editors are working on something good." />
      ) : (
        <Stagger className="grid md:grid-cols-2 gap-5">
          {posts.map((p) => (
            <StaggerItem key={p.id}>
              <Link to={`/blog/${p.slug}`} className="card card-hover overflow-hidden block group h-full">
                {p.image && <div className="overflow-hidden"><img src={p.image} alt={p.title} loading="lazy" className="w-full h-48 object-cover bg-slate-100 dark:bg-white/[0.04] group-hover:scale-105 transition-transform duration-500" /></div>}
                <div className="p-5">
                  <h3 className="font-extrabold text-lg leading-snug group-hover:text-brand-700 dark:group-hover:text-brand-300 transition-colors">{p.title}</h3>
                  <p className="text-sm text-slate-500 mt-2 line-clamp-2 leading-relaxed">{p.excerpt}</p>
                  <p className="text-xs text-slate-400 mt-3 font-semibold">{new Date(p.createdAt).toLocaleDateString()} · Read more →</p>
                </div>
              </Link>
            </StaggerItem>
          ))}
        </Stagger>
      )}
    </div>
  );
}

export function BlogPost() {
  const { slug } = useParams();
  const [post, setPost] = useState<any>(null);
  useEffect(() => { api(`/blog/${slug}`).then((d: any) => setPost(d.post)).catch(() => {}); }, [slug]);
  if (!post) return (
    <div className="max-w-3xl mx-auto px-4 mt-6 space-y-4">
      <Skeleton className="h-4 w-24" /><Skeleton className="h-10 w-3/4 !rounded-xl" /><Skeleton className="h-64 !rounded-3xl" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-2/3" />
    </div>
  );
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl mx-auto px-4 mt-6">
      <Link to="/blog" className="text-sm font-bold text-brand-600 dark:text-brand-300 hover:underline">← All posts</Link>
      <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mt-3 leading-tight">{post.title}</h1>
      <p className="text-sm text-slate-400 mt-2 font-medium">{new Date(post.createdAt).toLocaleDateString()}</p>
      {post.image && <img src={post.image} alt={post.title} className="w-full h-72 object-cover rounded-[2rem] mt-6 bg-slate-100 dark:bg-white/[0.04] shadow-card" />}
      <div className="mt-7 whitespace-pre-line text-slate-700 dark:text-slate-300 leading-[1.85] text-[16px]">{post.body}</div>
    </motion.div>
  );
}
