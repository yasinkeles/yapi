/**
 * Import products from Desktop/products.json into DB
 * Usage: node scripts/import-products.js
 */

const fs = require('fs');
const { Client } = require('pg');

const DB = { host: '192.168.0.61', port: 5432, database: 'yapi', user: 'postgres', password: '123456' };

const SELLER_ID = 6;
const CURRENCY = 'USD';
const DEFAULT_STOCK = 10;
const BATCH_SIZE = 200; // commit every N products

const slugify = (text) =>
  text.toString().trim().toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');

function buildDescription(prod, company, category) {
  const lines = [];
  lines.push(`**Ürün Kodu:** ${prod.c}`);
  lines.push(`**Üretici:** ${company}`);
  lines.push(`**Ürün Grubu:** ${category}`);
  if (prod.at) lines.push(`**Yöntem / Tip:** ${prod.at}`);
  if (prod.r)  lines.push(`**Reaktivite / Tür:** ${prod.r}`);
  if (prod.ra) lines.push(`**Araştırma Alanı:** ${prod.ra}`);
  if (prod.an) lines.push(`**Alternatif İsimler:** ${prod.an}`);
  if (prod.ui) lines.push(`**UniProt ID:** ${prod.ui}`);
  if (prod.se || prod.dr || prod.st || prod.al) {
    lines.push('');
    lines.push('**Teknik Özellikler:**');
    if (prod.se) lines.push(`- Hassasiyet: ${prod.se}`);
    if (prod.dr) lines.push(`- Tespit Aralığı: ${prod.dr}`);
    if (prod.st) lines.push(`- Uyumlu Örnek Türleri: ${prod.st}`);
    if (prod.al) lines.push(`- Analiz Süresi: ${prod.al}`);
  }
  if (prod.sz && prod.sz.length) {
    lines.push('');
    lines.push('**Boyutlar ve Fiyatlar:**');
    prod.sz.forEach(([size, price, campaign]) => {
      lines.push(`- ${size}: ${price} ${CURRENCY}${campaign && campaign !== price ? ` (Kampanya: ${campaign} ${CURRENCY})` : ''}`);
    });
  }
  if (prod.pdf) { lines.push(''); lines.push(`**Ürün Broşürü:** ${prod.pdf}`); }
  if (prod.pl)  lines.push(`**Üretici Sayfası:** ${prod.pl}`);
  return lines.join('\n');
}

function buildShortDescription(prod, company) {
  const parts = [];
  if (prod.at) parts.push(prod.at);
  if (prod.r)  parts.push(prod.r);
  if (prod.ra) parts.push(prod.ra);
  return parts.length ? parts.join(' | ') : company;
}

function buildSpecs(prod) {
  const specs = [];
  const add = (group, key, val) => { if (val) specs.push({ group, key, val: String(val).substring(0, 1000) }); };
  add('Temel Bilgiler', 'Ürün Kodu', prod.c);
  add('Temel Bilgiler', 'Yöntem / Tip', prod.at);
  add('Temel Bilgiler', 'Reaktivite', prod.r);
  add('Temel Bilgiler', 'Araştırma Alanı', prod.ra);
  add('Teknik', 'Hassasiyet', prod.se);
  add('Teknik', 'Tespit Aralığı', prod.dr);
  add('Teknik', 'Analiz Süresi', prod.al);
  add('Teknik', 'Örnek Türleri', prod.st);
  add('Kimlik', 'UniProt ID', prod.ui);
  add('Kimlik', 'Alternatif İsimler', prod.an ? prod.an.substring(0, 200) : null);
  if (prod.sz && prod.sz.length) {
    prod.sz.forEach(([size, price, campaign]) => {
      add('Boyutlar', size, `${price} ${CURRENCY}${campaign && campaign !== price ? ` (kampanya: ${campaign})` : ''}`);
    });
  }
  return specs;
}

async function main() {
  const client = new Client(DB);
  await client.connect();
  console.log('Connected to DB.');

  console.log('Reading products.json...');
  const raw = fs.readFileSync('C:/Users/Administrator/Desktop/products.json', 'utf8');
  const data = JSON.parse(raw);

  const companies = Object.keys(data);
  let total = 0;
  companies.forEach(c => Object.keys(data[c]).forEach(cat => { total += data[c][cat].length; }));
  console.log(`Companies: ${companies.length}, Total products: ${total}`);

  // Step 1: Categories
  console.log('Creating categories...');
  const categoryMap = {};
  for (const company of companies) {
    for (const cat of Object.keys(data[company])) {
      const key = `${company}|${cat}`;
      const catName = `${company} - ${cat}`;
      const catSlug = slugify(catName);
      const res = await client.query(
        `INSERT INTO categories (name, slug, is_active)
         VALUES ($1, $2, 1)
         ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
         RETURNING id`,
        [catName, catSlug]
      );
      categoryMap[key] = res.rows[0].id;
    }
  }
  console.log(`Categories: ${Object.keys(categoryMap).length}`);

  // Step 2: Existing SKUs
  const skuRes = await client.query('SELECT sku FROM products WHERE sku IS NOT NULL');
  const existingSkus = new Set(skuRes.rows.map(r => r.sku));
  const existingSlugRes = await client.query('SELECT slug FROM products');
  const existingSlugs = new Set(existingSlugRes.rows.map(r => r.slug));
  console.log(`Already in DB: ${existingSkus.size} products`);

  let inserted = 0, skipped = 0, errors = 0;
  let batchBuffer = [];

  const flushBatch = async () => {
    if (!batchBuffer.length) return;
    try {
      await client.query('BEGIN');
      for (const item of batchBuffer) {
        const { name, shortDesc, desc, basePrice, campaignPrice, categoryId, sku, slug, image, specs } = item;
        const pr = await client.query(
          `INSERT INTO products
            (seller_id, category_id, slug, name, short_description, description,
             base_price, campaign_price, currency, stock_qty, sku, is_active)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
           RETURNING id`,
          [SELLER_ID, categoryId, slug, name, shortDesc, desc,
           basePrice, campaignPrice || null, CURRENCY, DEFAULT_STOCK, sku, 1]
        );
        const productId = pr.rows[0].id;

        if (image) {
          await client.query(
            `INSERT INTO product_images (product_id, image_url, sort_order, alt_text, is_main) VALUES ($1,$2,0,$3,1)`,
            [productId, image, name.substring(0, 200)]
          );
        }

        for (let i = 0; i < specs.length; i++) {
          const s = specs[i];
          await client.query(
            `INSERT INTO product_specifications (product_id, spec_group, spec_key, spec_value, sort_order) VALUES ($1,$2,$3,$4,$5)`,
            [productId, s.group, s.key, s.val, i]
          );
        }

        existingSkus.add(sku);
        inserted++;
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      errors += batchBuffer.length;
      console.error(`Batch error: ${err.message}`);
    }
    batchBuffer = [];

    if (inserted % 1000 === 0 && inserted > 0) {
      console.log(`  Inserted: ${inserted} (skipped: ${skipped}, errors: ${errors})`);
    }
  };

  // Step 3: Process products
  for (const company of companies) {
    for (const cat of Object.keys(data[company])) {
      const products = data[company][cat];
      const categoryId = categoryMap[`${company}|${cat}`];

      for (const prod of products) {
        if (!prod.n || !prod.c) { skipped++; continue; }
        if (existingSkus.has(prod.c)) { skipped++; continue; }

        const firstSize = prod.sz && prod.sz.length ? prod.sz[0] : null;
        const basePrice = firstSize ? (firstSize[1] || 0) : 0;
        const campaignPrice = firstSize && firstSize[2] && firstSize[2] !== firstSize[1] ? firstSize[2] : null;

        // Generate unique slug
        let slug = slugify(`${prod.c}-${prod.n}`.substring(0, 80));
        if (existingSlugs.has(slug)) {
          let i = 2;
          while (existingSlugs.has(`${slug}-${i}`)) i++;
          slug = `${slug}-${i}`;
        }
        existingSlugs.add(slug);

        batchBuffer.push({
          name: prod.n,
          shortDesc: buildShortDescription(prod, company).substring(0, 500),
          desc: buildDescription(prod, company, cat),
          basePrice, campaignPrice, categoryId,
          sku: prod.c, slug,
          image: prod.ci || null,
          specs: buildSpecs(prod),
        });

        if (batchBuffer.length >= BATCH_SIZE) {
          await flushBatch();
        }
      }
    }
  }

  await flushBatch(); // remaining

  console.log(`\n✓ Done!`);
  console.log(`  Inserted : ${inserted}`);
  console.log(`  Skipped  : ${skipped}`);
  console.log(`  Errors   : ${errors}`);

  await client.end();
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
