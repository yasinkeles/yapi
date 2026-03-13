/**
 * Creates ELISA 1..20 test categories and assigns 50 random products to each.
 */
const { Client } = require("pg");

const client = new Client({
  host: "192.168.0.61",
  port: 5432,
  database: "yapi",
  user: "postgres",
  password: "123456",
});

async function main() {
  await client.connect();
  console.log("Connected.");

  // 1. Create 20 categories
  const categoryIds = [];
  for (let i = 1; i <= 20; i++) {
    const name = `ELISA ${i}`;
    const slug = `elisa-${i}`;
    const res = await client.query(
      `INSERT INTO categories (name, slug, is_active, created_at, updated_at)
       VALUES ($1, $2, 1, NOW(), NOW())
       ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      [name, slug]
    );
    categoryIds.push(res.rows[0].id);
    console.log(`Category: ${name} (id=${res.rows[0].id})`);
  }

  // 2. Get all product IDs
  const { rows: products } = await client.query(
    "SELECT id FROM products WHERE is_active = 1 ORDER BY RANDOM()"
  );
  console.log(`Total products: ${products.length}`);

  // 3. Assign 50 products to each category
  for (let i = 0; i < categoryIds.length; i++) {
    const catId = categoryIds[i];
    const slice = products.slice(i * 50, i * 50 + 50);
    if (slice.length === 0) {
      console.log(`Category id=${catId}: no products left`);
      continue;
    }
    const ids = slice.map((r) => r.id);
    await client.query(
      `UPDATE products SET category_id = $1 WHERE id = ANY($2::int[])`,
      [catId, ids]
    );
    console.log(`ELISA ${i + 1} (id=${catId}): assigned ${ids.length} products`);
  }

  console.log("Done.");
  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
