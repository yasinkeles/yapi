import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { getPublishedPageBySlug, getPagePreviewBySlug } from '../services/pages';
import BlockRenderer from '../components/builder/blocks/BlockRenderer';

const DynamicPage = () => {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const isPreview = searchParams.get('preview') === '1';
  const [page, setPage] = useState(null);
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [notPublished, setNotPublished] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        setNotFound(false);
        setNotPublished(false);
        const fetcher = isPreview ? getPagePreviewBySlug : getPublishedPageBySlug;
        const { data } = await fetcher(slug);
        const payload = data?.data || {};
        const blocks = payload.content_json?.blocks || payload.components_json?.blocks || [];
        console.log('[DynamicPage] payload', { payload, blocksCount: Array.isArray(blocks) ? blocks.length : null });
        setPage(payload);
        setBlocks(Array.isArray(blocks) ? blocks : []);
      } catch (err) {
        if (err.response?.status === 404) {
          const code = err.response?.data?.error?.code;
          if (code === 'NOT_PUBLISHED') {
            setNotPublished(true);
          } else {
            setNotFound(true);
          }
        } else {
          setError(err.response?.data?.error?.message || err.message);
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-300">
        <div className="animate-spin h-10 w-10 border-2 border-sky-400 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 px-4">
        <div className="max-w-md w-full bg-slate-900/80 border border-slate-800 rounded-2xl p-8 text-center space-y-3">
          <div className="text-4xl">😕</div>
          <h1 className="text-2xl font-semibold">Sayfa bulunamadı</h1>
          <p className="text-slate-400">İstediğiniz sayfa yayında değil veya silinmiş olabilir.</p>
        </div>
      </div>
    );
  }

  if (notPublished) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-800 px-4">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-3 shadow-sm">
          <div className="text-4xl">🛈</div>
          <h1 className="text-2xl font-semibold">This page is not published yet.</h1>
          <p className="text-slate-500">Use Preview or publish the page to make it visible here.</p>
          <a
            className="btn btn-primary text-sm px-4 py-2"
            href={`/p/${slug}?preview=1`}
          >
            Open Preview
          </a>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-red-300 px-4">
        <div className="max-w-lg w-full bg-red-950/40 border border-red-800 rounded-2xl p-6">
          <h1 className="text-xl font-semibold mb-2">Hata</h1>
          <p className="text-sm text-red-200">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <div className="max-w-5xl mx-auto px-4 md:px-6 lg:px-8 py-12 space-y-8">
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Dinamik Sayfa</p>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900">{page?.title || page?.name || slug}</h1>
          {page?.description && <p className="text-slate-600 max-w-3xl">{page.description}</p>}
        </header>

        <div className="space-y-6">
          {blocks.length === 0 && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-slate-500 text-sm">
              Bu sayfa henüz içerik içermiyor.
            </div>
          )}

          {blocks.map((block) => (
            <div key={block.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <BlockRenderer block={block} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DynamicPage;
