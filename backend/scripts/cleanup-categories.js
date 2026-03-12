const { Client } = require('pg');
const client = new Client({ host:'192.168.0.61', port:5432, database:'yapi', user:'postgres', password:'123456' });

async function run() {
  await client.connect();

  const oldSlugs = ['electronics','home','fashion','sports','books'];

  for (const slug of oldSlugs) {
    const cat = await client.query('SELECT id FROM categories WHERE slug = $1', [slug]);
    if (!cat.rows.length) { console.log(slug + ': zaten yok'); continue; }
    const catId = cat.rows[0].id;

    const prods = await client.query('SELECT id FROM products WHERE category_id = $1', [catId]);
    const ids = prods.rows.map(r => r.id);

    if (ids.length) {
      await client.query('DELETE FROM product_specifications WHERE product_id = ANY($1)', [ids]);
      await client.query('DELETE FROM product_images WHERE product_id = ANY($1)', [ids]);
      await client.query('DELETE FROM cart_items WHERE product_id = ANY($1)', [ids]);
      await client.query('DELETE FROM products WHERE id = ANY($1)', [ids]);
      console.log(slug + ': ' + ids.length + ' ürün silindi');
    }

    await client.query('DELETE FROM categories WHERE id = $1', [catId]);
    console.log(slug + ': kategori silindi');
  }

  const cnt = await client.query('SELECT COUNT(*) FROM categories');
  const cats = await client.query('SELECT name FROM categories ORDER BY name');
  console.log('Kalan kategori:', cnt.rows[0].count);
  cats.rows.forEach(r => console.log(' -', r.name));
  await client.end();
}

run().catch(e => { console.error(e.message); process.exit(1); });
