import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { getPublishedPageBySlug } from '../../services/pages';
import BlockRenderer from '../builder/blocks/BlockRenderer';

// Renders published blocks for /pages/:slug consumers
const PageRenderer = ({ slug }) => {
  const [state, setState] = useState({ loading: true, error: null, page: null, blocks: [] });

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const { data } = await getPublishedPageBySlug(slug);
        const payload = data?.data || {};
        const blocks = payload.content_json?.blocks || payload.components_json?.blocks || [];
        if (mounted) setState({ loading: false, error: null, page: payload, blocks: Array.isArray(blocks) ? blocks : [] });
      } catch (err) {
        const message = err.response?.data?.error?.message || err.message;
        if (mounted) setState({ loading: false, error: message, page: null, blocks: [] });
      }
    };
    load();
    return () => { mounted = false; };
  }, [slug]);

  if (state.loading) return <div className="p-6 text-slate-400">Loading page...</div>;
  if (state.error) return <div className="p-6 text-red-400">{state.error}</div>;

  return (
    <div className="p-6 space-y-4">
      <header className="space-y-1">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Published Page</p>
        <h1 className="text-2xl font-semibold text-slate-900">{state.page?.title || state.page?.name || slug}</h1>
        {state.page?.version && <p className="text-slate-500 text-sm">Version {state.page.version}</p>}
      </header>

      <div className="space-y-4">
        {state.blocks.length === 0 && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-slate-500 text-sm">
            This page has no published content.
          </div>
        )}

        {state.blocks.map((block) => (
          <div key={block.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <BlockRenderer block={block} />
          </div>
        ))}
      </div>
    </div>
  );
};

PageRenderer.propTypes = {
  slug: PropTypes.string.isRequired,
};

export default PageRenderer;
