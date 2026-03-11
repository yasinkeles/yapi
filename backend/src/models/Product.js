const db = require('../config/database');
const { ValidationError, NotFoundError } = require('../utils/errors');
const logger = require('../utils/logger').createModuleLogger('ProductModel');

const slugify = (text) => {
	return text
		.toString()
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.replace(/-+/g, '-');
};

class ProductModel {
	async generateUniqueSlug(baseName, desiredSlug = null, excludeId = null) {
		const baseSlug = slugify(baseName || desiredSlug || 'product');
		let candidate = desiredSlug ? slugify(desiredSlug) : baseSlug;
		let counter = 1;

		while (true) {
			const existing = await db.queryOne('SELECT id FROM products WHERE slug = ?', [candidate]);
			if (!existing || (excludeId && existing.id === excludeId)) break;
			counter += 1;
			candidate = `${baseSlug}-${counter}`;
		}

		return candidate;
	}

	mapProductRow(row) {
		if (!row) return null;
		return {
			id: row.id,
			sellerId: row.seller_id,
			categoryId: row.category_id,
			slug: row.slug,
			name: row.name,
			shortDescription: row.short_description,
			description: row.description,
			basePrice: row.base_price,
			campaignPrice: row.campaign_price,
			currency: row.currency,
			stockQty: row.stock_qty,
			sku: row.sku,
			isActive: !!row.is_active,
			createdAt: row.created_at,
			updatedAt: row.updated_at,
			mainImage: row.main_image || null,
			categoryName: row.category_name || null,
			categorySlug: row.category_slug || null
		};
	}

	async findById(id, options = {}) {
		const { sellerId = null, includeRelations = true } = options;

		let query = `
			SELECT p.*, c.name AS category_name, c.slug AS category_slug,
				(
					SELECT image_url FROM product_images
					WHERE product_id = p.id
					ORDER BY is_main DESC, sort_order ASC, id ASC
					LIMIT 1
				) AS main_image
			FROM products p
			LEFT JOIN categories c ON p.category_id = c.id
			WHERE p.id = ?
		`;
		const params = [id];

		if (sellerId) {
			query += ' AND p.seller_id = ?';
			params.push(sellerId);
		}

		const row = await db.queryOne(query, params);
		if (!row) {
			throw new NotFoundError('Product not found');
		}

		const product = this.mapProductRow(row);

		if (includeRelations) {
			const [images, specifications] = await Promise.all([
				this.findImages(id),
				this.findSpecifications(id)
			]);
			product.images = images;
			product.specifications = specifications;
		}

		return product;
	}

	async findBySlug(slug) {
		const row = await db.queryOne(
			`SELECT p.*, c.name AS category_name, c.slug AS category_slug,
				(
					SELECT image_url FROM product_images
					WHERE product_id = p.id
					ORDER BY is_main DESC, sort_order ASC, id ASC
					LIMIT 1
				) AS main_image
			 FROM products p
			 LEFT JOIN categories c ON p.category_id = c.id
			 WHERE p.slug = ? AND p.is_active = 1`,
			[slug]
		);

		if (!row) {
			throw new NotFoundError('Product not found');
		}

		const product = this.mapProductRow(row);
		product.images = await this.findImages(row.id);
		product.specifications = await this.findSpecifications(row.id);
		return product;
	}

	async listForSeller(options = {}) {
		const {
			sellerId,
			limit = 50,
			offset = 0,
			search = null,
			categoryId = null,
			isActive = null
		} = options;

		if (!sellerId) {
			throw new ValidationError('Seller id is required');
		}

		let query = `
			SELECT p.*, c.name AS category_name, c.slug AS category_slug,
				(
					SELECT image_url FROM product_images
					WHERE product_id = p.id
					ORDER BY is_main DESC, sort_order ASC, id ASC
					LIMIT 1
				) AS main_image
			FROM products p
			LEFT JOIN categories c ON p.category_id = c.id
			WHERE p.seller_id = ?
		`;
		const params = [sellerId];

		if (search) {
			query += ' AND (p.name ILIKE ? OR p.sku ILIKE ?)';
			const s = `%${search}%`;
			params.push(s, s);
		}

		if (categoryId) {
			query += ' AND p.category_id = ?';
			params.push(categoryId);
		}

		if (isActive !== null && isActive !== undefined) {
			query += ' AND p.is_active = ?';
			params.push(isActive ? 1 : 0);
		}

		query += ' ORDER BY p.updated_at DESC LIMIT ? OFFSET ?';
		params.push(limit, offset);

		const rows = await db.query(query, params);
		return rows.map((row) => this.mapProductRow(row));
	}

	async listPublic(options = {}) {
		const { categorySlug = null, search = null, limit = 30, offset = 0 } = options;

		let query = `
			SELECT p.*, c.name AS category_name, c.slug AS category_slug,
				(
					SELECT image_url FROM product_images
					WHERE product_id = p.id
					ORDER BY is_main DESC, sort_order ASC, id ASC
					LIMIT 1
				) AS main_image
			FROM products p
			LEFT JOIN categories c ON p.category_id = c.id
			WHERE p.is_active = 1
		`;
		const params = [];

		if (categorySlug) {
			query += ' AND c.slug = ?';
			params.push(categorySlug);
		}

		if (search) {
			query += ' AND (p.name ILIKE ? OR p.short_description ILIKE ?)';
			const s = `%${search}%`;
			params.push(s, s);
		}

		query += ' ORDER BY p.updated_at DESC LIMIT ? OFFSET ?';
		params.push(limit, offset);

		const rows = await db.query(query, params);
		return rows.map((row) => this.mapProductRow(row));
	}

	async create(payload, sellerId) {
		if (!sellerId) throw new ValidationError('Seller id is required');
		if (!payload.name) throw new ValidationError('Product name is required');
		if (payload.basePrice === undefined || payload.basePrice === null) {
			throw new ValidationError('Base price is required');
		}

		const slug = await this.generateUniqueSlug(payload.name, payload.slug, null);

		let productId;
		await db.transaction(async (trx) => {
			const result = await trx.execute(
				`INSERT INTO products (seller_id, category_id, slug, name, short_description, description, base_price, campaign_price, currency, stock_qty, sku, is_active)
				 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
			, [
				sellerId,
				payload.categoryId || null,
				slug,
				payload.name,
				payload.shortDescription || null,
				payload.description || null,
				payload.basePrice,
				payload.campaignPrice || null,
				payload.currency || 'USD',
				payload.stockQty || 0,
				payload.sku || null,
				payload.isActive === undefined ? 1 : payload.isActive ? 1 : 0
			]);

			productId = result.lastInsertRowid;

			if (Array.isArray(payload.images) && payload.images.length) {
				await this.saveImages(trx, productId, payload.images);
			}

			if (Array.isArray(payload.specifications) && payload.specifications.length) {
				await this.saveSpecifications(trx, productId, payload.specifications);
			}
		});

		return this.findById(productId, { sellerId, includeRelations: true });
	}

	async update(id, payload, sellerId, role = 'seller') {
		const existing = await this.findById(id, role === 'admin' ? {} : { sellerId, includeRelations: false });

		const updates = {
			category_id: payload.categoryId !== undefined ? payload.categoryId : existing.categoryId,
			name: payload.name !== undefined ? payload.name : existing.name,
			short_description: payload.shortDescription !== undefined ? payload.shortDescription : existing.shortDescription,
			description: payload.description !== undefined ? payload.description : existing.description,
			base_price: payload.basePrice !== undefined ? payload.basePrice : existing.basePrice,
			campaign_price: payload.campaignPrice !== undefined ? payload.campaignPrice : existing.campaignPrice,
			currency: payload.currency || existing.currency || 'USD',
			stock_qty: payload.stockQty !== undefined ? payload.stockQty : existing.stockQty,
			sku: payload.sku !== undefined ? payload.sku : existing.sku,
			is_active: payload.isActive === undefined ? (existing.isActive ? 1 : 0) : (payload.isActive ? 1 : 0)
		};

		const slug = payload.slug
			? await this.generateUniqueSlug(payload.slug || existing.name, payload.slug, id)
			: existing.slug;

		await db.transaction(async (trx) => {
			await trx.execute(
				`UPDATE products
				 SET category_id = ?, name = ?, short_description = ?, description = ?, base_price = ?, campaign_price = ?, currency = ?, stock_qty = ?, sku = ?, is_active = ?, slug = ?, updated_at = NOW()
				 WHERE id = ?`,
				[
					updates.category_id,
					updates.name,
					updates.short_description,
					updates.description,
					updates.base_price,
					updates.campaign_price,
					updates.currency,
					updates.stock_qty,
					updates.sku,
					updates.is_active,
					slug,
					id
				]
			);

			if (Array.isArray(payload.images)) {
				await this.saveImages(trx, id, payload.images);
			}

			if (Array.isArray(payload.specifications)) {
				await this.saveSpecifications(trx, id, payload.specifications);
			}
		});

		return this.findById(id, role === 'admin' ? {} : { sellerId, includeRelations: true });
	}

	async delete(id, sellerId, role = 'seller') {
		if (role !== 'admin') {
			await this.findById(id, { sellerId, includeRelations: false });
		}

		const result = await db.execute('DELETE FROM products WHERE id = ?', [id]);
		if (result.changes === 0) {
			throw new NotFoundError('Product not found');
		}
		return true;
	}

	async saveImages(trx, productId, images) {
		await trx.execute('DELETE FROM product_images WHERE product_id = ?', [productId]);

		const rows = images
			.filter((img) => img && img.imageUrl)
			.map((img, idx) => [
				productId,
				img.imageUrl,
				img.sortOrder !== undefined ? img.sortOrder : idx,
				img.altText || null,
				img.isMain ? 1 : 0
			]);

		for (const row of rows) {
			await trx.execute(
				'INSERT INTO product_images (product_id, image_url, sort_order, alt_text, is_main) VALUES (?, ?, ?, ?, ?)',
				row
			);
		}
	}

	async saveSpecifications(trx, productId, specifications) {
		await trx.execute('DELETE FROM product_specifications WHERE product_id = ?', [productId]);

		const rows = specifications
			.filter((spec) => spec && spec.specKey && spec.specValue)
			.map((spec, idx) => [
				productId,
				spec.specGroup || null,
				spec.specKey,
				spec.specValue,
				spec.sortOrder !== undefined ? spec.sortOrder : idx
			]);

		for (const row of rows) {
			await trx.execute(
				'INSERT INTO product_specifications (product_id, spec_group, spec_key, spec_value, sort_order) VALUES (?, ?, ?, ?, ?)',
				row
			);
		}
	}

	async findImages(productId) {
		const rows = await db.query(
			'SELECT * FROM product_images WHERE product_id = ? ORDER BY is_main DESC, sort_order ASC, id ASC',
			[productId]
		);

		return rows.map((row) => ({
			id: row.id,
			productId: row.product_id,
			imageUrl: row.image_url,
			sortOrder: row.sort_order,
			altText: row.alt_text,
			isMain: !!row.is_main
		}));
	}

	async findSpecifications(productId) {
		const rows = await db.query(
			'SELECT * FROM product_specifications WHERE product_id = ? ORDER BY sort_order ASC, id ASC',
			[productId]
		);

		return rows.map((row) => ({
			id: row.id,
			productId: row.product_id,
			specGroup: row.spec_group,
			specKey: row.spec_key,
			specValue: row.spec_value,
			sortOrder: row.sort_order
		}));
	}
}

module.exports = new ProductModel();
