import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getArticle } from '@/services/newsService';
import type { NewsArticle } from '@/types';
import { formatDate } from '@/utils/helpers';
import Avatar from '@/components/ui/Avatar';
import Badge from '@/components/ui/Badge';
import Spinner from '@/components/ui/Spinner';
import EmptyState from '@/components/ui/EmptyState';

const NewsArticlePage = () => {
  const { id } = useParams();
  const [article, setArticle] = useState<NewsArticle | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (id) setArticle(await getArticle(id));
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center"><Spinner /></div>;
  if (!article) return <div className="container-app py-20"><EmptyState title="Article not found" /></div>;

  return (
    <article className="animate-fade-in">
      {article.coverUrl && (
        <div className="h-64 w-full overflow-hidden md:h-80">
          <img src={article.coverUrl} alt={article.title} className="h-full w-full object-cover" />
        </div>
      )}
      <div className="container-app max-w-3xl py-10">
        <Link to="/news" className="text-sm text-brand-red hover:underline">← Back to news</Link>
        <Badge className="ml-2 bg-brand-red/20 text-brand-redGlow">{article.category}</Badge>
        <h1 className="heading-display mt-4 text-3xl font-bold text-white md:text-4xl">{article.title}</h1>
        <div className="mt-4 flex items-center gap-3 border-b border-brand-border pb-6 text-sm text-brand-gray">
          <Avatar name={article.authorName} size={36} />
          <div>
            <p className="font-medium text-brand-light">{article.authorName}</p>
            <p className="text-xs">{formatDate(article.createdAt)}</p>
          </div>
        </div>
        <div className="prose-invert mt-6 whitespace-pre-line text-base leading-relaxed text-brand-gray">
          {article.content}
        </div>
      </div>
    </article>
  );
};

export default NewsArticlePage;
