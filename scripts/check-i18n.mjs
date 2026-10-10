// Lists translation keys used in the code (t('a.b')) that are missing from en.json / bn.json.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const walk = (dir) => readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? walk(join(dir, f)) : [join(dir, f)]));
const flat = (o, p = '') => Object.entries(o).flatMap(([k, v]) => (typeof v === 'object' ? flat(v, `${p}${k}.`) : [`${p}${k}`]));
const have = { en: new Set(flat(JSON.parse(readFileSync('src/i18n/en.json', 'utf8')))), bn: new Set(flat(JSON.parse(readFileSync('src/i18n/bn.json', 'utf8')))) };

const used = new Set();
for (const file of walk('src').filter((f) => /\.(tsx?|ts)$/.test(f))) {
  const text = readFileSync(file, 'utf8');
  for (const m of text.matchAll(/\bt\(\s*'([a-zA-Z0-9_.]+)'/g)) used.add(m[1]);
  for (const m of text.matchAll(/\bt\(\s*`([a-zA-Z0-9_.]+)\.\$\{/g)) used.add(`${m[1]}.*`); // dynamic prefix
}
let bad = 0;
for (const key of [...used].sort()) {
  if (key.endsWith('.*')) continue;
  for (const l of ['en', 'bn']) if (!have[l].has(key)) { console.log(`${l}: missing ${key}`); bad++; }
}
console.log(bad ? `${bad} missing` : 'all keys present');
