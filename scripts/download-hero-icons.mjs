/**
 * Downloads hero portrait icons from the Marvel Rivals API.
 *
 * Setup:
 *   1. Register for a free API key at https://marvelrivalsapi.com
 *   2. Set the key: export MARVEL_RIVALS_API_KEY=your_key_here
 *
 * Usage:
 *   node scripts/download-hero-icons.mjs
 *   node scripts/download-hero-icons.mjs --skip-existing   # skip already-downloaded files
 *   node scripts/download-hero-icons.mjs --dry-run         # preview without downloading
 *
 * Saves images to public/assets/images/.
 * Requires Node 18+ (uses native fetch).
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, '../public/assets/images');
const API_BASE = 'https://marvelrivalsapi.com';
const HEROES_ENDPOINT = `${API_BASE}/api/v1/heroes`;

const API_KEY = process.env.MARVEL_RIVALS_API_KEY;
const SKIP_EXISTING = process.argv.includes('--skip-existing');
const DRY_RUN = process.argv.includes('--dry-run');

if (!API_KEY) {
  console.error('Error: MARVEL_RIVALS_API_KEY environment variable is not set.');
  console.error('Get a free key at https://marvelrivalsapi.com, then run:');
  console.error('  export MARVEL_RIVALS_API_KEY=your_key_here');
  process.exit(1);
}

// Maps API hero names → local filename stems (snake_case, no extension)
const NAME_OVERRIDES = {
  'cloak and dagger': 'cloak_and_dagger',
  'cloak & dagger': 'cloak_and_dagger',
  'mr. fantastic': 'mr_fantastic',
  'mister fantastic': 'mr_fantastic',
  'jeff the land shark': 'jeff_the_land_shark',
  'star-lord': 'star_lord',
  'spider-man': 'spider_man',
  'the punisher': 'the_punisher',
  'luna snow': 'luna_snow',
  'moon knight': 'moon_knight',
  'iron man': 'iron_man',
  'iron fist': 'iron_fist',
  'scarlet witch': 'scarlet_witch',
  'black panther': 'black_panther',
  'black widow': 'black_widow',
  'winter soldier': 'winter_soldier',
  'squirrel girl': 'squirrel_girl',
  'rocket raccoon': 'rocket_raccoon',
  'adam warlock': 'adam_warlock',
  'invisible woman': 'invisible_woman',
  'peni parker': 'peni_parker',
  'doctor strange': 'doctor_strange',
  'captain america': 'captain_america',
  'human torch': 'human_torch',
  'emma frost': 'emma_frost',
  'the thing': 'the_thing',
};

function toFilename(heroName) {
  const lower = heroName.toLowerCase().trim();
  if (NAME_OVERRIDES[lower]) return NAME_OVERRIDES[lower];
  return lower.replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

function extFromUrl(url) {
  const match = url.match(/\.(png|webp|jpg|jpeg)(\?.*)?$/i);
  return match ? `.${match[1].toLowerCase()}` : '.png';
}

async function downloadFile(url, destPath) {
  const res = await fetch(url, { headers: { 'x-api-key': API_KEY } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(destPath, buffer);
}

async function main() {
  if (DRY_RUN) console.log('[DRY RUN — no files will be written]\n');
  console.log(`Fetching hero list from ${HEROES_ENDPOINT}...`);

  let heroes;
  try {
    const res = await fetch(HEROES_ENDPOINT, {
      headers: { Accept: 'application/json', 'x-api-key': API_KEY },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    const data = await res.json();
    heroes = Array.isArray(data) ? data : (data.heroes ?? data.data ?? Object.values(data));
  } catch (err) {
    console.error('Failed to fetch hero list:', err.message);
    process.exit(1);
  }

  console.log(`Found ${heroes.length} heroes.\n`);

  let downloaded = 0, skipped = 0, failed = 0;

  for (const hero of heroes) {
    const name = hero.name ?? hero.hero_name ?? hero.display_name ?? '(unknown)';
    const stem = toFilename(name);

    // imageUrl = /heroes/cards/ironman.png (portrait card — preferred)
    // hero_icon = /heroes/transformations/squirrel-girl-headbig-0.webp (head icon)
    const imageFields = ['imageUrl', 'image_url', 'icon', 'hero_icon', 'portrait', 'thumbnail'];
    let rawPath = null;
    for (const field of imageFields) {
      if (hero[field]) { rawPath = hero[field]; break; }
    }

    if (!rawPath) {
      console.warn(`  WARN  ${name}: no image field. Keys: ${Object.keys(hero).join(', ')}`);
      failed++;
      continue;
    }

    const imageUrl = rawPath.startsWith('http') ? rawPath : `${API_BASE}${rawPath}`;
    const ext = extFromUrl(imageUrl);
    const filename = `${stem}${ext}`;
    const destPath = path.join(OUTPUT_DIR, filename);

    if (SKIP_EXISTING && fs.existsSync(destPath)) {
      console.log(`  skip  ${filename}`);
      skipped++;
      continue;
    }

    if (DRY_RUN) {
      console.log(`  would download  ${filename}  ←  ${imageUrl}`);
      downloaded++;
      continue;
    }

    try {
      await downloadFile(imageUrl, destPath);
      console.log(`  ✓  ${filename}  (${name})`);
      downloaded++;
    } catch (err) {
      console.error(`  ✗  ${filename}  — ${err.message}`);
      failed++;
    }
  }

  console.log(`\nDone. Downloaded: ${downloaded}, Skipped: ${skipped}, Failed: ${failed}`);

  if (downloaded > 0 && !DRY_RUN) {
    console.log('\nNext: update src/data/characters.json to reference the new filenames.');
    console.log('Image path format: /marvel-rivals-randomizer/assets/images/<filename>');
  }
}

main();
