import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiFileText, FiSearch } from 'react-icons/fi';
import { listArticles } from '@/services/newsService';
import type { NewsArticle } from '@/types';
import { formatDate, truncate } from '@/utils/helpers';
import SectionHeader from '@/components/ui/SectionHeader';
import Input from '@/components/ui/Input';
import { ListSkeleton } from '@/components/ui/Skeleton';
import EmptyState from '@/components/ui/EmptyState';
import clsx from 'clsx';

const News = () => {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');

  useEffect(() => {
    (async () => {
      setArticles(await listArticles({ publishedOnly: true, max: 50 }));
      setLoading(false);
    })();
  }, []);

  const categories = ['all', ...new Set(articles.map((a) => a.category).filter(Boolean))];
  const filtered = articles.filter(
    (a) =>
      (category === 'all' || a.category === category) &&
      (a.title.toLowerCase().includes(query.toLowerCase()) ||
        a.excerpt.toLowerCase().includes(query.toLowerCase()))
  );
  const featured = filtered.find((a) => a.featured) ?? filtered[0];
  const rest = filtered.filter((a) => a.id !== featured?.id);

  return (
    <div className="container-app animate-fade-in py-10">
      <SectionHeader title="News" subtitle="Latest from the SteigerDojo scene" icon={<FiFileText />} />

      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2 overflow-x-auto">
          {categories.map((c) => (
            <button key={c} onClick={() => setCategory(c)} className={clsx('shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold uppercase capitalize transition-colors', category === c ? 'bg-brand-red text-white' : 'border border-brand-border text-brand-gray hover:text-white')}>{c}</button>
          ))}
        </div>
        <div className="relative w-full sm:w-64">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-gray" size={15} />
          <Input className="pl-9" placeholder="Search news…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
      </div>

      {loading ? (
        <ListSkeleton count={6} />
      ) : filtered.length === 0 ? (
        <EmptyState icon={<FiFileText size={36} />} title="No articles found" />
      ) : (
        <div className="space-y-8">
          {featured && (
            <Link to={`/news/${featured.id}`} className="group grid grid-cols-1 overflow-hidden rounded-2xl border border-brand-border bg-brand-panel md:grid-cols-2">
              <div className="h-56 overflow-hidden bg-brand-dark md:h-auto">
                {featured.coverUrl ? (
                  <img src={featured.coverUrl} alt={featured.title} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                ) : <div className="h-full w-full bg-gradient-to-br from-brand-red/30 to-brand-dark" />}
              </div>
              <div className="flex flex-col justify-center p-8">
                <span className="text-xs font-semibold uppercase tracking-wide text-brand-red">{featured.category}</span>
                <h2 className="heading-display mt-2 text-2xl text-white group-hover:text-brand-red">{featured.title}</h2>
                <p className="mt-3 text-sm text-brand-gray">{truncate(featured.excerpt, 180)}</p>
                <p className="mt-4 text-xs text-brand-gray">{featured.authorName} · {formatDate(featured.createdAt)}</p>
              </div>
            </Link>
          )}

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {rest.map((a) => (
              <Link key={a.id} to={`/news/${a.id}`} className="group overflow-hidden rounded-xl border border-brand-border bg-brand-panel transition-colors hover:border-brand-red/50">
                <div className="h-40 overflow-hidden bg-brand-dark">
                  {a.coverUrl ? (
                    <img src={a.coverUrl} alt={a.title} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                  ) : <div className="h-full w-full bg-gradient-to-br from-brand-red/20 to-brand-dark" />}
                </div>
                <div className="p-4">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-brand-red">{a.category}</span>
                  <h3 className="mt-1 line-clamp-2 font-semibold text-white group-hover:text-brand-red">{a.title}</h3>
                  <p className="mt-2 line-clamp-2 text-xs text-brand-gray">{a.excerpt}</p>
                  <p className="mt-3 text-xs text-brand-gray">{formatDate(a.createdAt)}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default News;
