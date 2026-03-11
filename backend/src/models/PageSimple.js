const db = require('../config/database');
const { ValidationError, NotFoundError } = require('../utils/errors');

class PageSimpleModel {
  async list({ status = null }) {
    const params = [];
    let sql = 'SELECT id, slug, title, status, current_version_id, content_json, created_at, updated_at FROM pages WHERE 1=1';
    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }
    sql += ' ORDER BY created_at DESC';
    return db.query(sql, params);
  }

  async findById(id) {
    const page = await db.queryOne(
      'SELECT id, slug, title, status, current_version_id, content_json, created_at, updated_at FROM pages WHERE id = ?',
      [id]
    );
    return page || null;
  }

  async findBySlug(slug, { status = null, includeArchived = false } = {}) {
    const params = [slug];
    let sql = 'SELECT id, slug, title, status, current_version_id, content_json, created_at, updated_at FROM pages WHERE slug = ?';
    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    } else if (!includeArchived) {
      sql += " AND status <> 'archived'";
    }
    return db.queryOne(sql, params);
  }

  async findVersionById(id) {
    const row = await db.queryOne(
      'SELECT id, page_id, version, path, layout_json, components_json, published_at, created_at, updated_at FROM page_versions WHERE id = ?',
      [id]
    );
    if (!row) return null;
    try {
      row.components_json = typeof row.components_json === 'object' ? row.components_json : JSON.parse(row.components_json || '{}');
    } catch (e) {
      row.components_json = {};
    }
    try {
      row.layout_json = typeof row.layout_json === 'object' ? row.layout_json : JSON.parse(row.layout_json || '{}');
    } catch (e) {
      row.layout_json = {};
    }
    return row;
  }

  async create({ slug, title, status = 'draft', contentJson = { blocks: [] }, userId = null }) {
    if (!slug || !title) throw new ValidationError('slug and title are required');
    const existing = await this.findBySlug(slug);
    if (existing) throw new ValidationError('slug already exists');

    const result = await db.execute(
      `INSERT INTO pages (slug, name, title, status, content_json, created_by, updated_by)
       VALUES (?, ?, ?, ?, ?::jsonb, ?, ?)` ,
      [slug, title, title, status, JSON.stringify(contentJson || { blocks: [] }), userId, userId]
    );

    const pageId = result.lastInsertRowid;

    if (status === 'published') {
      await this._publishDraft(pageId, { slug, blocks: contentJson?.blocks || [], userId });
    }

    return this.findById(pageId);
  }

  async update(id, { title, status, contentJson = { blocks: [] }, userId = null }) {
    const page = await this.findById(id);
    if (!page) throw new NotFoundError('Page not found');

    const nextStatus = status || page.status;
    const nextTitle = title || page.title;

    await db.execute(
      `UPDATE pages
       SET title = ?, name = ?, status = ?, content_json = ?::jsonb, updated_by = ?, updated_at = NOW()
       WHERE id = ?` ,
      [nextTitle, nextTitle, nextStatus, JSON.stringify(contentJson || { blocks: [] }), userId, id]
    );

    if (nextStatus === 'published') {
      await this._publishDraft(id, { slug: page.slug, blocks: contentJson?.blocks || [], userId });
    }

    return this.findById(id);
  }

  async publish(id, userId = null) {
    const page = await this.findById(id);
    if (!page) throw new NotFoundError('Page not found');

    const draftBlocks = page.content_json?.blocks || [];
    const versionId = await this._publishDraft(id, { slug: page.slug, blocks: draftBlocks, userId });
    return { pageId: id, versionId };
  }

  async archive(id, userId = null) {
    const page = await this.findById(id);
    if (!page) throw new NotFoundError('Page not found');

    await db.execute(
      `UPDATE pages SET status = 'archived', updated_by = ?, updated_at = NOW() WHERE id = ?`,
      [userId, id]
    );

    return true;
  }

  async hardDelete(id) {
    const page = await this.findById(id);
    if (!page) throw new NotFoundError('Page not found');

    await db.execute('DELETE FROM pages WHERE id = ?', [id]);
    return true;
  }

  async _publishDraft(pageId, { slug, blocks = [], userId = null }) {
    // Ensure blocks is array to avoid corrupt versions
    const safeBlocks = Array.isArray(blocks) ? blocks : [];
    const page = await this.findById(pageId);
    if (!page) throw new NotFoundError('Page not found');

    const existingVersion = page.current_version_id
      ? await db.queryOne('SELECT id, version FROM page_versions WHERE id = ?', [page.current_version_id])
      : null;

    const nextVersion = async () => {
      const row = await db.queryOne('SELECT COALESCE(MAX(version), 0)::int AS v FROM page_versions WHERE page_id = ?', [pageId]);
      return (row?.v || 0) + 1;
    };

    if (existingVersion) {
      await db.execute(
        `UPDATE page_versions
         SET path = ?, layout_json = ?::jsonb, components_json = ?::jsonb,
             published_at = COALESCE(published_at, NOW())
         WHERE id = ?` ,
        [`/p/${slug}`, JSON.stringify({ blocks: safeBlocks }), JSON.stringify({ blocks: safeBlocks }), existingVersion.id]
      );

      await db.execute(
        `UPDATE pages SET status = 'published', current_version_id = ?, updated_at = NOW(), updated_by = ? WHERE id = ?` ,
        [existingVersion.id, userId, pageId]
      );
      return existingVersion.id;
    }

    const versionNumber = await nextVersion();

    const insertResult = await db.execute(
      `INSERT INTO page_versions (page_id, version, path, layout_json, components_json, published_at, created_by)
       VALUES (?, ?, ?, ?::jsonb, ?::jsonb, NOW(), ?)` ,
      [pageId, versionNumber, `/p/${slug}`, JSON.stringify({ blocks: safeBlocks }), JSON.stringify({ blocks: safeBlocks }), userId]
    );

    await db.execute(
      `UPDATE pages SET status = 'published', current_version_id = ?, updated_at = NOW(), updated_by = ? WHERE id = ?` ,
      [insertResult.lastInsertRowid, userId, pageId]
    );

    return insertResult.lastInsertRowid;
  }
}

module.exports = new PageSimpleModel();
