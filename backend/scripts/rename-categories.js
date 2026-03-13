/**
 * Renames ELISA 1..20 categories with random biotech brand names.
 */
const { Client } = require("pg");

const brands = [
  "BioNova ELISA",
  "ProteGen ELISA",
  "CellTech ELISA",
  "MediBio ELISA",
  "GenePlex ELISA",
  "ImmunoLab ELISA",
  "BioTrace ELISA",
  "LifeGen ELISA",
  "PathoBio ELISA",
  "NovaMed ELISA",
  "BioQuest ELISA",
  "TheraBio ELISA",
  "ClinPath ELISA",
  "BioMark ELISA",
  "ProBio ELISA",
  "MediGen ELISA",
  "LabNova ELISA",
  "BioLink ELISA",
  "GenTech ELISA",
  "AlphaGen ELISA",
];

const client = new Client({
  host: "192.168.0.61",
  port: 5432,
  database: "yapi",
  user: "postgres",
  password: "123456",
});

async function main() {
  await client.connect();

  for (let i = 1; i <= 20; i++) {
    const oldSlug = `elisa-${i}`;
    const newName = brands[i - 1];
    const newSlug = newName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

    const { rowCount } = await client.query(
      `UPDATE categories SET name = $1, slug = $2, updated_at = NOW() WHERE slug = $3`,
      [newName, newSlug, oldSlug]
    );
    console.log(`${oldSlug} → ${newSlug} (${newName}) [${rowCount} updated]`);
  }

  console.log("Done.");
  await client.end();
}

main().catch((err) => { console.error(err); process.exit(1); });
