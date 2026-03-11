/**
 * Page Model
 * Handles pages, versions, and publish operations for dynamic UI builder
 */

const db = require('../config/database');
const logger = require('../utils/logger').createModuleLogger('PageModel');
const { ValidationError, NotFoundError, AuthorizationError } = require('../utils/errors');

const parseJsonSafe = (value) => {
  if (!value) return null;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch (err) {
    return null;
  }
};

const isRoleAllowed = (permissionsJson, role) => {
  const perms = parseJsonSafe(permissionsJson);
  if (!perms) return true;
  if (Array.isArray(perms)) {
    if (perms.includes('*')) return true;
    return perms.includes(role);
  }
  if (perms.roles && Array.isArray(perms.roles)) {
    if (perms.roles.includes('*')) return true;
    return perms.roles.includes(role);
  }
  return true;
};

class PageModel {
  async list({ status = null, search = null, limit = 20, offset = 0 }) {
    const params = [];
    let query = `
      SELECT p.*, pv.id AS version_id, pv.version, pv.path, pv.title, pv.description, pv.published_at
      FROM pages p
      LEFT JOIN page_versions pv ON pv.id = p.current_version_id
      WHERE 1=1
    `;

    if (status) {
      query += ' AND p.status = ?';
      params.push(status);
    }

    if (search) {
      query += ' AND (LOWER(p.name) LIKE LOWER(?) OR LOWER(p.slug) LIKE LOWER(?))';
      const pattern = `%${search}%`;
      params.push(pattern, pattern);
    }

    query += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    return db.query(query, params);
  }

  async count({ status = null, search = null }) {
    const params = [];
    let query = 'SELECT COUNT(*)::int AS count FROM pages WHERE 1=1';
    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }
    if (search) {
      query += ' AND (LOWER(name) LIKE LOWER(?) OR LOWER(slug) LIKE LOWER(?))';
      const pattern = `%${search}%`;
      params.push(pattern, pattern);
    }
    const row = await db.queryOne(query, params);
    return row ? row.count : 0;
  }

  async findById(id) {
    const page = await db.queryOne('SELECT * FROM pages WHERE id = ?', [id]);
    return page || null;
  }

  async findBySlug(slug) {
    const page = await db.queryOne('SELECT * FROM pages WHERE slug = ?', [slug]);
    return page || null;
  }

  async getCurrentVersion(pageId) {
    return db.queryOne(
      `SELECT pv.* FROM page_versions pv
       JOIN pages p ON p.current_version_id = pv.id
       WHERE p.id = ?`,
      [pageId]
    );
  }

  async getVersions(pageId) {
    return db.query(
      `SELECT * FROM page_versions WHERE page_id = ? ORDER BY version DESC`,
      [pageId]
    );
  }

  async createPageWithVersion({ slug, name, path, layoutJson, componentsJson, permissionsJson = null, visibilityRulesJson = null, userId }) {
    if (!slug || !name || !path || !layoutJson || !componentsJson) {
      throw new ValidationError('slug, name, path, layout_json, and components_json are required');
    }

    const existing = await this.findBySlug(slug);
    if (existing) {
      throw new ValidationError('Slug already exists');
    }

    const defaultPerms = permissionsJson || { roles: ['admin'] };
    const defaultVisibility = visibilityRulesJson || { roles: ['admin'] };

    return db.transaction(async (tx) => {
      const pageResult = await tx.execute(
        `INSERT INTO pages (slug, name, status, created_by, updated_by)
         VALUES (?, ?, 'published', ?, ?)` ,
        [slug, name, userId || null, userId || null]
      );

      const pageId = pageResult.lastInsertRowid;

      const versionResult = await tx.execute(
        `INSERT INTO page_versions (page_id, version, path, layout_json, components_json, permissions_json, visibility_rules_json, published_at, created_by)
         VALUES (?, 1, ?, ?::json, ?::json, ?::json, ?::json, NOW(), ?)` ,
        [pageId, path, JSON.stringify(layoutJson), JSON.stringify(componentsJson), JSON.stringify(defaultPerms), JSON.stringify(defaultVisibility), userId || null]
      );

      await tx.execute(
        `UPDATE pages SET current_version_id = ? WHERE id = ?`,
        [versionResult.lastInsertRowid, pageId]
      );

      return {
        pageId,
        versionId: versionResult.lastInsertRowid,
        version: 1
      };
    });
  }

  async addVersion(pageId, { path, layoutJson, componentsJson, permissionsJson = null, visibilityRulesJson = null, userId }) {
    const page = await this.findById(pageId);
    if (!page) throw new NotFoundError('Page not found');

    if (!path || !layoutJson || !componentsJson) {
      throw new ValidationError('path, layout_json, and components_json are required');
    }

    const current = await this.getCurrentVersion(pageId);
    const perms = permissionsJson || parseJsonSafe(current?.permissions_json) || { roles: ['admin'] };
    const visibility = visibilityRulesJson || parseJsonSafe(current?.visibility_rules_json) || { roles: ['admin'] };

    if (current) {
      await db.execute(
        `UPDATE page_versions
         SET path = ?, layout_json = ?::json, components_json = ?::json,
             permissions_json = ?::json, visibility_rules_json = ?::json,
             published_at = NOW(), updated_at = NOW(), updated_by = ?
         WHERE id = ?`,
        [path, JSON.stringify(layoutJson), JSON.stringify(componentsJson), JSON.stringify(perms), JSON.stringify(visibility), userId || null, current.id]
      );

      await db.execute(
        `UPDATE pages SET status = 'published', current_version_id = ?, updated_at = NOW(), updated_by = ? WHERE id = ?`,
        [current.id, userId || null, pageId]
      );

      return { versionId: current.id, version: current.version || 1 };
    }

    const result = await db.execute(
      `INSERT INTO page_versions (page_id, version, path, layout_json, components_json, permissions_json, visibility_rules_json, published_at, created_by)
       VALUES (?, 1, ?, ?::json, ?::json, ?::json, ?::json, NOW(), ?)` ,
      [pageId, path, JSON.stringify(layoutJson), JSON.stringify(componentsJson), JSON.stringify(perms), JSON.stringify(visibility), userId || null]
    );

    await db.execute(
      `UPDATE pages SET status = 'published', current_version_id = ?, updated_at = NOW(), updated_by = ? WHERE id = ?`,
      [result.lastInsertRowid, userId || null, pageId]
    );

    return { versionId: result.lastInsertRowid, version: 1 };
  }

  async publishVersion(pageId, versionNumber, userId) {
    // Versioning/publish flow is simplified: addVersion already publishes. Keep method for compatibility.
    const current = await this.getCurrentVersion(pageId);
    if (!current) throw new NotFoundError('Page not found or no version to publish');
    await db.execute(
      `UPDATE pages SET status = 'published', updated_by = ?, updated_at = NOW() WHERE id = ?`,
      [userId || null, pageId]
    );
    return true;
  }

  async archive(pageId, userId) {
    const page = await this.findById(pageId);
    if (!page) throw new NotFoundError('Page not found');

    await db.execute(
      `UPDATE pages SET status = 'archived', updated_by = ?, updated_at = NOW() WHERE id = ?`,
      [userId || null, pageId]
    );

    await db.execute(
      `INSERT INTO page_audit_logs (page_id, action, actor_id, details)
       VALUES (?, 'archive', ?, NULL)` ,
      [pageId, userId || null]
    );

    return true;
  }

  async restore(pageId, userId) {
    const page = await this.findById(pageId);
    if (!page) throw new NotFoundError('Page not found');
    if (!page.current_version_id) throw new ValidationError('No version to publish');

    await db.transaction(async (tx) => {
      await tx.execute(
        `UPDATE pages SET status = 'published', updated_by = ?, updated_at = NOW() WHERE id = ?`,
        [userId || null, pageId]
      );
      await tx.execute(
        `UPDATE page_versions SET published_at = COALESCE(published_at, NOW()) WHERE id = ?`,
        [page.current_version_id]
      );
      await tx.execute(
        `INSERT INTO page_audit_logs (page_id, page_version_id, action, actor_id, details)
         VALUES (?, ?, 'restore', ?, NULL)` ,
        [pageId, page.current_version_id, userId || null]
      );
    });

    return true;
  }

  async deleteArchived(pageId) {
    const page = await this.findById(pageId);
    if (!page) throw new NotFoundError('Page not found');
    if (page.status !== 'archived') {
      throw new ValidationError('Only archived pages can be deleted');
    }

    await db.transaction(async (tx) => {
      await tx.execute('DELETE FROM page_audit_logs WHERE page_id = ?', [pageId]);
      await tx.execute('DELETE FROM page_versions WHERE page_id = ?', [pageId]);
      await tx.execute('DELETE FROM pages WHERE id = ?', [pageId]);
    });

    return true;
  }

  async getPublishedBySlug(slug) {
    const row = await db.queryOne(
      `SELECT p.id AS page_id, p.slug, p.name, p.status,
              pv.id AS version_id, pv.version, pv.path, pv.layout_json, pv.components_json,
              pv.permissions_json, pv.visibility_rules_json, pv.published_at
       FROM pages p
       JOIN page_versions pv ON pv.id = p.current_version_id
       WHERE p.slug = ? AND p.status = 'published'`,
      [slug]
    );
    if (!row) return null;

    row.layout_json = parseJsonSafe(row.layout_json);
    row.components_json = parseJsonSafe(row.components_json);
    row.permissions_json = parseJsonSafe(row.permissions_json);
    row.visibility_rules_json = parseJsonSafe(row.visibility_rules_json);
    return row;
  }

  enforcePermissions(pageRow, role) {
    if (!pageRow) throw new NotFoundError('Page not found');
    const allowed = isRoleAllowed(pageRow.permissions_json, role);
    if (!allowed) {
      throw new AuthorizationError('Insufficient permissions to view this page');
    }
  }
}

module.exports = new PageModel();
