/**
 * Page Controller
 * Admin CRUD + publish and runtime fetch for dynamic pages
 */

const PageModel = require('../models/Page');
const { successResponse, paginatedResponse } = require('../utils/response');
const { AuthorizationError, NotFoundError } = require('../utils/errors');
const logger = require('../utils/logger').createModuleLogger('PageController');

class PageController {
  // Admin: list pages
  async list(req, res, next) {
    try {
      const { page = 1, limit = 20, status = null, q = null } = req.query;
      const offset = (page - 1) * limit;
      const items = await PageModel.list({ status, search: q, limit: parseInt(limit), offset });
      const total = await PageModel.count({ status, search: q });
      return paginatedResponse(res, items, page, limit, total);
    } catch (err) {
      next(err);
    }
  }

  // Admin: get single page with current version
  async getOne(req, res, next) {
    try {
      const pageId = req.params.id;
      const page = await PageModel.findById(pageId);
      if (!page) throw new NotFoundError('Page not found');
      const currentVersion = page.current_version_id ? await PageModel.getCurrentVersion(pageId) : null;
      return successResponse(res, { page, currentVersion });
    } catch (err) {
      next(err);
    }
  }

  // Admin: create page + version 1 draft
  async create(req, res, next) {
    try {
      const { slug, name, path, layout_json, components_json, permissions_json, visibility_rules_json } = req.body;
      const result = await PageModel.createPageWithVersion({
        slug,
        name,
        path,
        layoutJson: layout_json,
        componentsJson: components_json,
        permissionsJson: permissions_json,
        visibilityRulesJson: visibility_rules_json,
        userId: req.user?.id
      });
      return successResponse(res, result, {}, 201);
    } catch (err) {
      next(err);
    }
  }

  // Admin: add new version
  async addVersion(req, res, next) {
    try {
      const pageId = req.params.id;
      const { path, layout_json, components_json, permissions_json, visibility_rules_json } = req.body;
      const result = await PageModel.addVersion(pageId, {
        path,
        layoutJson: layout_json,
        componentsJson: components_json,
        permissionsJson: permissions_json,
        visibilityRulesJson: visibility_rules_json,
        userId: req.user?.id
      });
      return successResponse(res, result, {}, 201);
    } catch (err) {
      next(err);
    }
  }

  // Admin: list versions
  async listVersions(req, res, next) {
    try {
      const versions = await PageModel.getVersions(req.params.id);
      return successResponse(res, versions);
    } catch (err) {
      next(err);
    }
  }

  // Admin: publish version
  async publish(req, res, next) {
    try {
      const { version } = req.body;
      await PageModel.publishVersion(req.params.id, version, req.user?.id);
      return successResponse(res, { message: 'Published' });
    } catch (err) {
      next(err);
    }
  }

  // Admin: archive page
  async archive(req, res, next) {
    try {
      await PageModel.archive(req.params.id, req.user?.id);
      return successResponse(res, { message: 'Archived' });
    } catch (err) {
      next(err);
    }
  }

  // Admin: delete archived page permanently
  async deleteArchived(req, res, next) {
    try {
      await PageModel.deleteArchived(req.params.id);
      return successResponse(res, { message: 'Deleted' });
    } catch (err) {
      next(err);
    }
  }

  // Admin: restore archived page back to published
  async restore(req, res, next) {
    try {
      await PageModel.restore(req.params.id, req.user?.id);
      return successResponse(res, { message: 'Restored' });
    } catch (err) {
      next(err);
    }
  }

  // Runtime: fetch published page by slug with permission enforcement
  async getPublishedBySlug(req, res, next) {
    try {
      const slug = req.params.slug;
      const page = await PageModel.getPublishedBySlug(slug);
      if (!page) throw new NotFoundError('Page not found');

      const role = req.user?.role || null;
      PageModel.enforcePermissions(page, role);

      return successResponse(res, {
        slug: page.slug,
        name: page.name,
        version: page.version,
        path: page.path,
        layout: page.layout_json,
        components: page.components_json,
        permissions: page.permissions_json,
        visibility_rules: page.visibility_rules_json,
        published_at: page.published_at
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new PageController();
