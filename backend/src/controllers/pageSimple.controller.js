/**
 * Simple Page Controller
 * CRUD for page builder + runtime fetch by slug (published only)
 */

const PageSimple = require('../models/PageSimple');
const { successResponse } = require('../utils/response');
const { NotFoundError } = require('../utils/errors');
const logger = require('../utils/logger');

class PageSimpleController {
  async list(req, res, next) {
    try {
      const { status = null } = req.query;
      const pages = await PageSimple.list({ status });
      return successResponse(res, pages);
    } catch (err) {
      next(err);
    }
  }

  async create(req, res, next) {
    try {
      const { slug, title, status = 'draft', content_json } = req.body;

      logger.info('PageSimple.create received', {
        slug,
        title,
        status,
        blocksCount: Array.isArray(content_json?.blocks) ? content_json.blocks.length : null
      });

      if (!content_json || !Array.isArray(content_json.blocks)) {
        return res.status(400).json({ success: false, error: { message: 'content_json.blocks is required', code: 'INVALID_BODY' } });
      }

      const created = await PageSimple.create({
        slug,
        title,
        status,
        contentJson: { blocks: content_json.blocks },
        userId: req.user?.id || null
      });
      return successResponse(res, created, {}, 201);
    } catch (err) {
      next(err);
    }
  }

  async getOne(req, res, next) {
    try {
      const page = await PageSimple.findById(req.params.id);
      if (!page) throw new NotFoundError('Page not found');
      return successResponse(res, page);
    } catch (err) {
      next(err);
    }
  }

  async update(req, res, next) {
    try {
      const { title, status, content_json } = req.body;

      logger.info('PageSimple.update received', {
        id: req.params.id,
        title,
        status,
        blocksCount: Array.isArray(content_json?.blocks) ? content_json.blocks.length : null
      });

      if (!content_json || !Array.isArray(content_json.blocks)) {
        return res.status(400).json({ success: false, error: { message: 'content_json.blocks is required', code: 'INVALID_BODY' } });
      }

      const updated = await PageSimple.update(req.params.id, {
        title,
        status,
        contentJson: { blocks: content_json.blocks },
        userId: req.user?.id || null
      });
      return successResponse(res, updated);
    } catch (err) {
      next(err);
    }
  }

  async archive(req, res, next) {
    try {
      await PageSimple.archive(req.params.id, req.user?.id || null);
      return successResponse(res, { message: 'Archived' });
    } catch (err) {
      next(err);
    }
  }

  async hardDelete(req, res, next) {
    try {
      await PageSimple.hardDelete(req.params.id);
      return successResponse(res, { message: 'Deleted' });
    } catch (err) {
      next(err);
    }
  }

  async getPublishedBySlug(req, res, next) {
    try {
      const slug = req.params.slug;
      const preview = req.query.preview === '1';
      const page = await PageSimple.findBySlug(slug, { includeArchived: false });
      if (!page) throw new NotFoundError('Page not found');

      if (preview) {
        const blocks = page.content_json?.blocks || [];
        logger.info('PageSimple.getPublishedBySlug preview', {
          slug,
          status: page.status,
          currentVersionId: page.current_version_id,
          blocksCount: Array.isArray(blocks) ? blocks.length : null
        });
        return successResponse(res, {
          id: page.id,
          slug: page.slug,
          title: page.title,
          status: page.status,
          content_json: page.content_json,
          current_version_id: page.current_version_id,
          version: null,
          published_at: null
        });
      }

      if (!page.current_version_id) {
        const blocks = page.content_json?.blocks || [];
        logger.info('PageSimple.getPublishedBySlug fallback to draft (no current_version_id)', {
          slug,
          status: page.status,
          blocksCount: Array.isArray(blocks) ? blocks.length : null
        });
        return successResponse(res, {
          id: page.id,
          slug: page.slug,
          title: page.title,
          status: page.status,
          content_json: page.content_json,
          current_version_id: null,
          version: null,
          published_at: null
        });
      }

      const version = await PageSimple.findVersionById(page.current_version_id);
      if (!version) throw new NotFoundError('Published version not found');

      const blocks = version.components_json?.blocks || [];
      logger.info('PageSimple.getPublishedBySlug returning version', {
        slug,
        status: page.status,
        currentVersionId: page.current_version_id,
        blocksCount: Array.isArray(blocks) ? blocks.length : null,
        versionNumber: version.version
      });

      return successResponse(res, {
        id: page.id,
        slug: page.slug,
        title: page.title,
        status: page.status,
        content_json: version.components_json,
        current_version_id: page.current_version_id,
        version: version.version,
        published_at: version.published_at
      });
    } catch (err) {
      next(err);
    }
  }

  async getPreviewBySlug(req, res, next) {
    try {
      const slug = req.params.slug;
      const page = await PageSimple.findBySlug(slug, { includeArchived: false });
      if (!page) throw new NotFoundError('Page not found');
      const blocks = page.content_json?.blocks || [];
      logger.info('PageSimple.getPreviewBySlug returning', {
        slug,
        blocksCount: Array.isArray(blocks) ? blocks.length : null,
        keys: page ? Object.keys(page) : []
      });
      return successResponse(res, page);
    } catch (err) {
      next(err);
    }
  }

  async publish(req, res, next) {
    try {
      const { id } = req.params;
      const result = await PageSimple.publish(id, req.user?.id || null);
      return successResponse(res, { message: 'Published', ...result });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new PageSimpleController();
