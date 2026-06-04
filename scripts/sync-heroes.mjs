/**
 * Syncs hero icons and characters.json with the Marvel Rivals API.
 *
 * Setup:
 *   1. Register for a free API key at https://marvelrivalsapi.com
 *   2. Set the key: export MARVEL_RIVALS_API_KEY=your_key_here  (or via Windows env vars)
 *
 * Usage:
 *   node scripts/sync-heroes.mjs                  # sync everything
 *   node scripts/sync-heroes.mjs --dry-run        # preview changes without writing
 *   node scripts/sync-heroes.mjs --icons-only     # download images, skip characters.json
 *   node scripts/sync-heroes.mjs --data-only      # update characters.json, skip images
 *
 * Requires Node 18+ (uses native fetch).
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const IMAGES_DIR = path.join(__dirname, '../public/assets/images');
const CHARACTERS_JSON = path.join(__dirname, '../src/data/characters.json');
const IMAGE_BASE_PATH = '/marvel-rivals-randomizer/assets/images';
const API_BASE = 'https://marvelrivalsapi.com';
const HEROES_ENDPOINT = `${API_BASE}/api/v2/heroes`;

const API_KEY = process.env.MARVEL_RIVALS_API_KEY;
const DRY_RUN = process.argv.includes('--dry-run');
const ICONS_ONLY = process.argv.includes('--icons-only');
const DATA_ONLY = process.argv.includes('--data-only');

if (!API_KEY) {
  console.error('Error: MARVEL_RIVALS_API_KEY is not set.');
  console.error('Get a free key at https://marvelrivalsapi.com, then set it as an env variable.');
  process.exit(1);
}

if (ICONS_ONLY && DATA_ONLY) {
  console.error('Error: --icons-only and --data-only are mutually exclusive.');
  process.exit(1);
}

// Maps API role names → our role names (handles whatever the API returns)
const ROLE_MAP = {
  vanguard: 'Vanguard',
  tank: 'Vanguard',
  duelist: 'Duelist',
  damage: 'Duelist',
  dps: 'Duelist',
  attacker: 'Duelist',
  strategist: 'Strategist',
  support: 'Strategist',
  healer: 'Strategist',
};

function normalizeRole(apiRole) {
  if (!apiRole) return null;
  return ROLE_MAP[apiRole.toLowerCase().trim()] ?? null;
}

// Converts any hero name to the snake_case filename stem used in this repo.
// No manual overrides needed — handles special chars algorithmically.
function toFilename(heroName) {
  return heroName
    .toLowerCase()
    .trim()
    .replace(/\s*&\s*/g, '_and_')   // "Cloak & Dagger" → "cloak_and_dagger"
    .replace(/[^a-z0-9]+/g, '_')   // everything else non-alphanumeric → _
    .replace(/^_|_$/g, '');        // strip leading/trailing underscores
}

function extFromUrl(url) {
  const match = url.match(/\.(png|webp|jpg|jpeg)(\?.*)?$/i);
  return match ? `.${match[1].toLowerCase()}` : '.png';
}

async function fetchHeroes() {
  const res = await fetch(HEROES_ENDPOINT, {
    headers: { Accept: 'application/json', 'x-api-key': API_KEY },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return Array.isArray(data) ? data : (data.heroes ?? data.data ?? Object.values(data));
}

function getImageField(hero) {
  // imageUrl = /heroes/cards/ironman.png (portrait card — preferred)
  // hero_icon = /heroes/transformations/... (head icon — fallback)
  for (const field of ['imageUrl', 'image_url', 'icon', 'hero_icon', 'portrait', 'thumbnail']) {
    if (hero[field]) return hero[field];
  }
  return null;
}

async function downloadImage(url, destPath) {
  const res = await fetch(url, { headers: { 'x-api-key': API_KEY } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  fs.writeFileSync(destPath, Buffer.from(await res.arrayBuffer()));
}

async function main() {
  if (DRY_RUN) console.log('[DRY RUN — no files will be written]\n');

  console.log('Fetching hero list from API...');
  let heroes;
  try {
    heroes = await fetchHeroes();
  } catch (err) {
    console.error('Failed to fetch heroes:', err.message);
    process.exit(1);
  }
  console.log(`Found ${heroes.length} heroes.\n`);

  const characters = JSON.parse(fs.readFileSync(CHARACTERS_JSON, 'utf8'));
  const existingNames = new Set(
    Object.values(characters).flat().map(c => c.name.toLowerCase())
  );

  const newHeroes = [];   // heroes added to characters.json
  const unknownRole = []; // heroes whose role the API didn't provide

  let downloaded = 0, skipped = 0, imgFailed = 0;

  for (const hero of heroes) {
    const name = hero.name ?? hero.hero_name ?? hero.display_name;
    if (!name) continue;

    const stem = toFilename(name);
    const rawPath = getImageField(hero);

    // ── Image ────────────────────────────────────────────────────────────
    if (!DATA_ONLY && rawPath) {
      const imageUrl = rawPath.startsWith('http') ? rawPath : `${API_BASE}${rawPath}`;
      const ext = extFromUrl(imageUrl);
      const filename = `${stem}${ext}`;
      const destPath = path.join(IMAGES_DIR, filename);

      if (DRY_RUN) {
        console.log(`  img  would download  ${filename}`);
        downloaded++;
      } else {
        try {
          await downloadImage(imageUrl, destPath);
          console.log(`  img  ✓  ${filename}`);
          downloaded++;
        } catch (err) {
          console.error(`  img  ✗  ${filename} — ${err.message}`);
          imgFailed++;
        }
      }
    }

    // ── characters.json ───────────────────────────────────────────────────
    if (!ICONS_ONLY && !existingNames.has(name.toLowerCase())) {
      const apiRole = hero.role ?? hero.hero_role ?? hero.type ?? hero.class;
      const role = normalizeRole(apiRole);

      if (!role) {
        unknownRole.push({ name, apiRole: apiRole ?? '(none)' });
        continue;
      }

      const rawPath2 = getImageField(hero);
      const imageUrl = rawPath2 ? (rawPath2.startsWith('http') ? rawPath2 : `${API_BASE}${rawPath2}`) : null;
      const ext = imageUrl ? extFromUrl(imageUrl) : '.png';
      const entry = { name, image: `${IMAGE_BASE_PATH}/${stem}${ext}` };

      if (DRY_RUN) {
        console.log(`  data would add  ${name}  →  ${role}`);
      } else {
        characters[role].push(entry);
        console.log(`  data ✓  added ${name} → ${role}`);
      }
      newHeroes.push({ name, role });
    }
  }

  // ── Write characters.json ─────────────────────────────────────────────
  if (!ICONS_ONLY && newHeroes.length > 0 && !DRY_RUN) {
    fs.writeFileSync(CHARACTERS_JSON, JSON.stringify(characters, null, 4));
    console.log(`\nUpdated characters.json (+${newHeroes.length} heroes)`);
  }

  // ── Summary ───────────────────────────────────────────────────────────
  console.log('\n── Summary ──────────────────────────────────────');
  console.log(`Images:  downloaded ${downloaded}, skipped ${skipped}, failed ${imgFailed}`);
  console.log(`Heroes:  ${newHeroes.length} added to characters.json`);

  if (unknownRole.length > 0) {
    console.log(`\nCould not determine role for ${unknownRole.length} hero(es) — add manually:`);
    unknownRole.forEach(h => console.log(`  ${h.name}  (API returned role: "${h.apiRole}")`));
  }
}

main();
