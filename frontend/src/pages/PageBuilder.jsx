import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { nanoid } from 'nanoid';
import { createPage, getPage, updatePage, listPages, publishPage } from '../services/pages';
import Palette from '../components/builder/Palette';
import Canvas from '../components/builder/Canvas';
import PropertiesPanel from '../components/builder/PropertiesPanel';

const defaultBlocks = [];

const slugify = (value) =>
  (value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '') || 'page';

const PageBuilder = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [page, setPage] = useState({
    title: 'New Page',
    slug: 'new-page',
    status: 'published',
    blocks: defaultBlocks
  });
  const [pagesList, setPagesList] = useState([]);
  const [pagesLoading, setPagesLoading] = useState(true);
  const [pagesError, setPagesError] = useState(null);
  const [slugDirty, setSlugDirty] = useState(isEdit);
  const [selectedBlockId, setSelectedBlockId] = useState(null);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const pageRef = useRef(page);

  useEffect(() => {
    pageRef.current = page;
  }, [page]);

  useEffect(() => {
    if (!isEdit) {
      // reset to blank state for new pages
      setPage({ title: 'New Page', slug: 'new-page', status: 'published', blocks: defaultBlocks });
      setSlugDirty(false);
      setSelectedBlockId(null);
      setLoading(false);
      return;
    }

    const load = async () => {
      try {
        const { data } = await getPage(id);
        const pageData = data?.data;
        const content = pageData?.content_json || {};
        setPage({
          title: pageData?.title || pageData?.name || 'Page',
          slug: pageData?.slug || 'page',
          status: pageData?.status || 'draft',
          blocks: content.blocks || []
        });
        setSlugDirty(true);
        setSelectedBlockId(null);
        setLoading(false);
      } catch (err) {
        setError(err.response?.data?.error?.message || err.message);
        setLoading(false);
      }
    };
    load();
  }, [id, isEdit]);

  useEffect(() => {
    const loadPages = async () => {
      try {
        setPagesLoading(true);
        const { data } = await listPages({ limit: 200 });
        setPagesList(data?.data || []);
        setPagesError(null);
      } catch (err) {
        setPagesError(err.response?.data?.error?.message || err.message);
      } finally {
        setPagesLoading(false);
      }
    };
    loadPages();
  }, []);

  const blockMap = useMemo(() => {
    const map = new Map();
    (page.blocks || []).forEach((block) => map.set(block.id, block));
    return map;
  }, [page.blocks]);

  const addBlock = (type) => {
    const id = nanoid(8);
    const baseProps = {
      header: { text: 'Header', subtitle: 'Subheading', cta: 'Learn more', href: '#' },
      text: { text: 'Lorem ipsum dolor sit amet.' },
      image: { src: 'https://via.placeholder.com/600x300', alt: 'Image' },
      card: {
        title: 'Product title',
        text: 'Short description goes here.',
        price: '$19.00',
        badge: '20% Off',
        image: 'https://via.placeholder.com/600x360',
        buttonLabel: 'View details',
        href: '#'
      },
      grid: { columns: 3, gap: 16 },
      section: { padding: 24, background: '#f8fafc', rounded: true, shadow: true },
      button: { label: 'Click', href: '#' },
      productSlider: {
        title: 'Featured Products',
        productsCount: 5,
        showPrice: true,
        showButton: true
      }
    };
    setPage((p) => ({
      ...p,
      blocks: [...(p.blocks || []), { id, type, props: baseProps[type] || {}, children: [] }]
    }));
    setSelectedBlockId(id);
  };

  const updateBlocks = (blocks) => setPage((p) => ({ ...p, blocks }));

  const updateBlockProps = (blockId, props) => {
    setPage((p) => ({
      ...p,
      blocks: (p.blocks || []).map((block) =>
        block.id === blockId ? { ...block, props: { ...block.props, ...props } } : block
      )
    }));
  };

  const handleTitleChange = (value) => {
    setPage((p) => ({
      ...p,
      title: value,
      slug: slugDirty ? p.slug : slugify(value)
    }));
  };

  const handleSlugChange = (value) => {
    setSlugDirty(true);
    setPage((p) => ({ ...p, slug: slugify(value) }));
  };

  const handleStatusChange = (value) => {
    setPage((p) => ({ ...p, status: value }));
  };

  const onSave = async () => {
    try {
      setSaving(true);
      const current = pageRef.current;
      const payload = {
        slug: current.slug,
        title: current.title,
        status: current.status,
        content_json: { blocks: current.blocks }
      };
      console.log('[PageBuilder] save payload', { isEdit, id, payload });

      let targetId = id;

      if (isEdit) {
        await updatePage(id, payload);
        targetId = id;
      } else {
        const { data } = await createPage(payload);
        targetId = data?.data?.id;
        if (targetId) navigate(`/admin/pages/${targetId}/edit`);
      }

      if (payload.status === 'published' && targetId) {
        try {
          await publishPage(targetId);
          console.log('[PageBuilder] publish success', { targetId });
        } catch (pubErr) {
          alert(pubErr.response?.data?.error?.message || pubErr.message || 'Publish failed');
        }
      }

      if (targetId) {
        const { data } = await getPage(targetId);
        const pageData = data?.data;
        const content = pageData?.content_json || {};
        setPage({
          title: pageData?.title || pageData?.name || 'Page',
          slug: pageData?.slug || 'page',
          status: pageData?.status || payload.status,
          blocks: content.blocks || []
        });
      }

      if (payload.status === 'published') {
        alert('Published. View should now show content.');
      }
    } catch (err) {
      alert(err.response?.data?.error?.message || err.message);
    } finally {
      setSaving(false);
    }
  };

  const onPublish = async () => {
    if (!isEdit) {
      alert('Save the page first, then publish.');
      return;
    }
    try {
      setSaving(true);
      await publishPage(id);
      const { data } = await getPage(id);
      const pageData = data?.data;
      const content = pageData?.content_json || {};
      setPage({
        title: pageData?.title || pageData?.name || 'Page',
        slug: pageData?.slug || 'page',
        status: 'published',
        blocks: content.blocks || []
      });
      alert('Published. View should now show content.');
    } catch (err) {
      alert(err.response?.data?.error?.message || err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-6 text-slate-400">Loading...</div>;
  if (error) return <div className="p-6 text-red-400">{error}</div>;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{isEdit ? 'Edit Page' : 'New Page'} (Drag & Drop)</h1>
          <p className="text-slate-400 text-sm">Build pages with blocks, reorder, and edit properties.</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap justify-end">
          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-700">Page</label>
            <select
              className="bg-white border border-slate-200 rounded px-3 py-2 text-sm text-slate-900 min-w-[200px]"
              disabled={pagesLoading || pagesError}
              value={isEdit ? id : ''}
              onChange={(e) => {
                const val = e.target.value;
                if (val) navigate(`/admin/pages/${val}/edit`);
              }}
            >
              <option value="">{pagesLoading ? 'Loading...' : pagesError ? 'Load error' : 'Select page'}</option>
              {pagesList.map((p) => (
                <option key={p.id} value={p.id}>{p.slug} — {p.title}</option>
              ))}
            </select>
          </div>

          <button
            className="btn btn-secondary text-sm"
            onClick={() => {
              setPage({ title: 'New Page', slug: 'new-page', status: 'published', blocks: defaultBlocks });
              setSlugDirty(false);
              setSelectedBlockId(null);
              navigate('/admin/pages/new');
            }}
          >
            New Page
          </button>

          <button
            className="btn btn-primary text-sm"
            disabled={saving}
            onClick={onSave}
          >
            {saving ? 'Saving...' : page.status === 'published' ? 'Save & Publish' : 'Save Draft'}
          </button>

          <button
            className="btn btn-primary text-sm"
            disabled={saving || !isEdit}
            onClick={onPublish}
          >
            Publish
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <label className="space-y-1 text-sm text-slate-900">
          <span>Title</span>
          <input
            className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm text-slate-900"
            value={page.title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="Landing Page"
          />
        </label>
        <label className="space-y-1 text-sm text-slate-900">
          <span>Slug</span>
          <input
            className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm text-slate-900"
            value={page.slug}
            onChange={(e) => handleSlugChange(e.target.value)}
            disabled={isEdit}
            placeholder="landing-page"
          />
        </label>
        <label className="space-y-1 text-sm text-slate-900">
          <span>Status</span>
          <select
            className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-sm text-slate-900"
            value={page.status}
            onChange={(e) => handleStatusChange(e.target.value)}
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
        </label>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <Palette onAdd={addBlock} />
        <Canvas
          blocks={page.blocks || []}
          selectedBlockId={selectedBlockId}
          onSelect={setSelectedBlockId}
          onReorder={updateBlocks}
          onUpdateBlocks={updateBlocks}
          renderPreview
        />
        <PropertiesPanel
          block={blockMap.get(selectedBlockId) || null}
          onChange={(props) => selectedBlockId && updateBlockProps(selectedBlockId, props)}
        />
      </div>
    </div>
  );
};

export default PageBuilder;
