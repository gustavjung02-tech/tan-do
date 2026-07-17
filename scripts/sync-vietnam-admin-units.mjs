import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outputPath = resolve(__dirname, '../data/vietnam-admin-units.json');

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
  return response.json();
}

async function main() {
  const provinces = await fetchJson('https://provinces.open-api.vn/api/v2/?depth=2');
  const normalized = provinces.map((province) => ({
    code: province.code,
    name: province.name,
    wards: (province.wards || []).map((ward) => ({
      code: ward.code,
      name: ward.name,
      province_code: province.code,
    })),
  }));

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(normalized, null, 2)}\n`, 'utf8');
  console.log(`Saved ${normalized.length} provinces and ${normalized.reduce((sum, province) => sum + province.wards.length, 0)} wards to ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
