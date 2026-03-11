// Smoke test for PageBuilder persistence using PageSimple model directly
// Run with: node scripts/test-pagebuilder.js

const { v4: uuid } = require('uuid');
const db = require('../src/config/database');
const PageSimple = require('../src/models/PageSimple');

(async () => {
  const slug = `test-page-${uuid().slice(0, 8)}`;
  const title = 'Test Header Page';
  const blocks = [
    {
      id: 'header-1',
      type: 'header',
      props: { text: 'Hello', subtitle: 'World', cta: 'Learn', href: '#' },
      children: []
    }
  ];

  try {
    await db.initialize();

    const created = await PageSimple.create({
      slug,
      title,
      status: 'published',
      contentJson: { blocks },
      userId: null
    });
    console.log('Created page:', { id: created.id, slug: created.slug, blocks: created.content_json?.blocks?.length });

    const fetched = await PageSimple.findById(created.id);
    const fetchedBlocks = fetched?.content_json?.blocks || [];

    if (!Array.isArray(fetchedBlocks) || fetchedBlocks.length !== 1 || fetchedBlocks[0]?.type !== 'header') {
      console.error('❌ Fetch failed or blocks mismatch', { fetched });
      process.exit(1);
    }

    console.log('✅ Page persisted with header block after reload', {
      slug: fetched.slug,
      blocksCount: fetchedBlocks.length,
      firstBlockType: fetchedBlocks[0]?.type
    });
  } catch (err) {
    console.error('❌ Test failed', err);
    process.exit(1);
  } finally {
    try {
      // Best-effort cleanup
      const fetched = await PageSimple.findBySlug(slug);
      if (fetched?.id) {
        await PageSimple.hardDelete(fetched.id);
      }
    } catch (cleanupErr) {
      console.error('Cleanup error (non-fatal):', cleanupErr.message);
    }
    db.close?.();
  }
})();
