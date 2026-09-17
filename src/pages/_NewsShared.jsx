import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../api/client';
import { useLang } from '../context/LanguageContext';
import ContentBlock from '../components/ContentBlock';
import { groupBlocksIntoRows } from '../components/blockLayout';

export function NewsList() {
  const { t, ml } = useLang();
  const [news, setNews] = useState([]);
  useEffect(() => { api.get('/news').then((r) => setNews(r.data)); }, []);

  if (news.length === 0) return <p className="text-slate-500">{t('noNews')}</p>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {news.map((n) => (
        <Link key={n._id} to={`/news/${n._id}`} className="card hover:shadow-md">
          {n.coverImage && (
            <img src={n.coverImage} alt="" className="w-full h-32 object-cover rounded mb-2" />
          )}
          <h3 className="font-semibold">{ml(n.title)}</h3>
          <p className="text-xs text-slate-500">{new Date(n.createdAt).toLocaleDateString()}</p>
        </Link>
      ))}
    </div>
  );
}

export function NewsDetail() {
  const { id } = useParams();
  const { ml } = useLang();
  const [item, setItem] = useState(null);

  useEffect(() => { api.get(`/news/${id}`).then((r) => setItem(r.data)); }, [id]);
  if (!item) return null;

  const blocks = (item.blocks || []).slice().sort((a, b) => (a.order || 0) - (b.order || 0));
  const rows = groupBlocksIntoRows(blocks);

  const rowStyle = {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'stretch',
    width: '100%',
  };

  return (
    <article className="max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">{ml(item.title)}</h1>
      <p className="text-sm text-slate-500 mb-4">{new Date(item.createdAt).toLocaleDateString()}</p>
      {rows.map((row, idx) => (
        <div key={idx} style={rowStyle}>
          {row.items.map(({ block, widthPct }) => (
            <ContentBlock key={block._id || block.order} block={block} widthPct={widthPct} />
          ))}
        </div>
      ))}
    </article>
  );
}

export default NewsList;
