/**
 * Database Initialization Script
 * Initializes schema and seeds demo data for quick manual testing
 */

const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const environment = require('../config/environment');

// Must mock config before requiring database if environment variables are not set properly in context
if (!process.env.SQLITE_PATH) process.env.SQLITE_PATH = './data/app.db';

const db = require('../config/database');

const slugify = (text) => text
  .toString()
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .replace(/-+/g, '-');

const ensureUser = async ({ username, email, password, role }) => {
  const existing = await db.queryOne('SELECT * FROM users WHERE username = ?', [username]);
  if (existing) return existing;

  const hashedPassword = await bcrypt.hash(password, 10);
  const result = await db.execute(
    `INSERT INTO users (username, email, password_hash, role, is_active)
     VALUES (?, ?, ?, ?, ?)` ,
    [username, email, hashedPassword, role, 1]
  );

  console.log(`Seeded user ${username} with role ${role}`);
  return db.queryOne('SELECT * FROM users WHERE id = ?', [result.lastInsertRowid]);
};

const ensureCategoryId = async (slug) => {
  const category = await db.queryOne('SELECT id FROM categories WHERE slug = ?', [slug]);
  return category ? category.id : null;
};

const ensureSellerStore = async (sellerId) => {
  const existing = await db.queryOne('SELECT * FROM seller_stores WHERE seller_id = ?', [sellerId]);
  if (existing) return existing;

  const baseSlug = slugify('Demo Store');
  const slugCandidate = await db.queryOne('SELECT id FROM seller_stores WHERE slug = ?', [baseSlug]) ? `${baseSlug}-demo` : baseSlug;

  const result = await db.execute(
    `INSERT INTO seller_stores (seller_id, store_name, slug, tagline, description, logo_url, banner_url, theme_color, accent_color, card_template, homepage_template, is_published)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
    [
      sellerId,
      'Demo Seller Store',
      slugCandidate,
      'Quality picks for quick testing',
      'Pre-seeded catalog to validate storefront flows.',
      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?w=1200&auto=format&fit=crop',
      '#0f172a',
      '#22c55e',
      'template-1',
      'default',
      1
    ]
  );

  console.log('Seeded demo seller store');
  return db.queryOne('SELECT * FROM seller_stores WHERE id = ?', [result.lastInsertRowid]);
};

const ensureCardStyle = async (sellerId, storeId) => {
  const existing = await db.queryOne('SELECT * FROM seller_card_styles WHERE seller_id = ?', [sellerId]);
  if (existing) return existing;

  const result = await db.execute(
    `INSERT INTO seller_card_styles (seller_id, store_id, card_template, primary_color, secondary_color, text_color, background_color, border_radius, shadow, config_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
    [
      sellerId,
      storeId,
      'template-1',
      '#0f172a',
      '#22c55e',
      '#0b1021',
      '#f8fafc',
      '12px',
      'soft',
      { badgeStyle: 'pill', priceEmphasis: 'bold' }
    ]
  );

  console.log('Seeded demo card style');
  return db.queryOne('SELECT * FROM seller_card_styles WHERE id = ?', [result.lastInsertRowid]);
};

const ensureProduct = async ({ sellerId, categorySlug, slug, name, shortDescription, description, basePrice, campaignPrice, currency, stockQty, sku }) => {
  const existing = await db.queryOne('SELECT * FROM products WHERE slug = ?', [slug]);
  if (existing) return existing;

  const categoryId = await ensureCategoryId(categorySlug);
  const result = await db.execute(
    `INSERT INTO products (seller_id, category_id, slug, name, short_description, description, base_price, campaign_price, currency, stock_qty, sku, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
    [
      sellerId,
      categoryId,
      slug,
      name,
      shortDescription,
      description,
      basePrice,
      campaignPrice,
      currency,
      stockQty,
      sku,
      1
    ]
  );

  console.log(`Seeded product ${name}`);
  return db.queryOne('SELECT * FROM products WHERE id = ?', [result.lastInsertRowid]);
};

const ensureProductImage = async (productId, imageUrl, sortOrder, altText, isMain = false) => {
  const existing = await db.queryOne('SELECT 1 FROM product_images WHERE product_id = ? AND image_url = ?', [productId, imageUrl]);
  if (existing) return;

  await db.execute(
    `INSERT INTO product_images (product_id, image_url, sort_order, alt_text, is_main)
     VALUES (?, ?, ?, ?, ?)` ,
    [productId, imageUrl, sortOrder, altText, isMain ? 1 : 0]
  );
};

const ensureProductSpec = async (productId, specKey, specValue, specGroup = null, sortOrder = 0) => {
  const existing = await db.queryOne(
    'SELECT 1 FROM product_specifications WHERE product_id = ? AND spec_key = ? AND spec_value = ?',
    [productId, specKey, specValue]
  );
  if (existing) return;

  await db.execute(
    `INSERT INTO product_specifications (product_id, spec_group, spec_key, spec_value, sort_order)
     VALUES (?, ?, ?, ?, ?)` ,
    [productId, specGroup, specKey, specValue, sortOrder]
  );
};

const ensureSections = async (sellerId, storeId, demoProducts) => {
  const existing = await db.queryOne('SELECT 1 FROM seller_store_sections WHERE seller_id = ? LIMIT 1', [sellerId]);
  if (existing) return;

  await db.execute(
    `INSERT INTO seller_store_sections (seller_id, store_id, seller_store_id, section_type, title, position, card_template, config_json, is_pinned, is_visible)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
    [
      sellerId,
      storeId,
      storeId,
      'products',
      'Featured Tech',
      1,
      'template-1',
      { layout: 'grid', productSlugs: demoProducts.slice(0, 1).map((p) => p.slug) },
      1,
      1
    ]
  );

  await db.execute(
    `INSERT INTO seller_store_sections (seller_id, store_id, seller_store_id, section_type, title, position, card_template, config_json, is_pinned, is_visible)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
    [
      sellerId,
      storeId,
      storeId,
      'products',
      'Home Office Picks',
      2,
      'template-2',
      { layout: 'carousel', productSlugs: demoProducts.map((p) => p.slug) },
      0,
      1
    ]
  );

  console.log('Seeded demo storefront sections');
};

const seedDemoData = async () => {
  console.log('Seeding demo data...');

  const seller = await ensureUser({
    username: 'sellerdemo',
    email: 'seller@example.com',
    password: 'seller123!',
    role: 'seller'
  });

  const store = await ensureSellerStore(seller.id);
  await ensureCardStyle(seller.id, store.id);

  const phone = await ensureProduct({
    sellerId: seller.id,
    categorySlug: 'electronics',
    slug: 'demo-smartphone-x',
    name: 'Demo Smartphone X',
    shortDescription: 'Flagship-inspired demo phone',
    description: '6.5" OLED display, 128GB storage, dual camera setup, and all-day battery for demo flows.',
    basePrice: 699.00,
    campaignPrice: 649.00,
    currency: 'USD',
    stockQty: 25,
    sku: 'DEMO-PHONE-X'
  });

  await ensureProductImage(
    phone.id,
    'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=900&auto=format&fit=crop',
    0,
    'Front view of Demo Smartphone X',
    true
  );
  await ensureProductImage(
    phone.id,
    'https://images.unsplash.com/photo-1512499617640-c2f999098c01?w=900&auto=format&fit=crop',
    1,
    'Angled view of Demo Smartphone X'
  );
  await ensureProductSpec(phone.id, 'Display', '6.5" OLED', 'Hardware', 1);
  await ensureProductSpec(phone.id, 'Storage', '128GB', 'Hardware', 2);
  await ensureProductSpec(phone.id, 'Battery', '4,500 mAh', 'Hardware', 3);

  const chair = await ensureProduct({
    sellerId: seller.id,
    categorySlug: 'home',
    slug: 'demo-ergonomic-chair',
    name: 'ErgoFlex Demo Chair',
    shortDescription: 'Breathable mesh with lumbar support',
    description: 'Adjustable height, tilt, and lumbar support to showcase cart flows.',
    basePrice: 289.00,
    campaignPrice: 249.00,
    currency: 'USD',
    stockQty: 40,
    sku: 'DEMO-CHAIR-ERG'
  });

  await ensureProductImage(
    chair.id,
    'https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=900&auto=format&fit=crop',
    0,
    'ErgoFlex demo chair',
    true
  );
  await ensureProductImage(
    chair.id,
    'https://images.unsplash.com/photo-1523419400526-2230d3794b2f?w=900&auto=format&fit=crop',
    1,
    'Side profile of ErgoFlex chair'
  );
  await ensureProductSpec(chair.id, 'Material', 'Mesh + steel', 'Build', 1);
  await ensureProductSpec(chair.id, 'Weight Capacity', '300 lbs', 'Build', 2);
  await ensureProductSpec(chair.id, 'Adjustments', 'Height, tilt, lumbar', 'Build', 3);

  await ensureSections(seller.id, store.id, [phone, chair]);

  console.log('Demo data ready. Credentials: sellerdemo / seller123!');
};

const init = async () => {
  try {
    console.log('Initializing database...');

    await db.initialize();

    const adminUser = await db.queryOne('SELECT 1 FROM users WHERE role = ? LIMIT 1', ['admin']);
    if (!adminUser) {
      console.log('Seeding default admin user...');
      const hashedPassword = await bcrypt.hash('admin123!', 10);

      await db.execute(
        `INSERT INTO users (username, email, password_hash, role, is_active)
         VALUES (?, ?, ?, ?, ?)` ,
        ['admin', 'admin@local', hashedPassword, 'admin', 1]
      );

      console.log('Default admin user created (username: admin / password: admin123!). Please change immediately.');
    } else {
      console.log('Admin user already exists.');
    }

    await seedDemoData();

    console.log('Database initialization completed successfully.');

    const logDir = path.dirname(environment.logFilePath);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
      console.log(`Created logs directory: ${logDir}`);
    }

    process.exit(0);
  } catch (error) {
    console.error('Initialization failed:', error);
    process.exit(1);
  }
};

init();
