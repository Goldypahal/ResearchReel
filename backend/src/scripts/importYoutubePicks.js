/**
 * Imports the "Research Picks" feed: research talks and lectures that play from YouTube
 * through the privacy-enhanced embed player. Nothing is downloaded or stored on our side.
 *
 *   npm run import:picks                       # uses data/youtube_picks.jsonl.gz
 *   npm run import:picks -- path/to/file.jsonl[.gz] [--limit 500] [--dry-run] [--prune]
 *
 * --prune hides picks that are no longer in the file (e.g. the video was removed from
 * YouTube or its owner turned embedding off).
 *
 * Safe to run again: rows are matched on the YouTube id, metadata and order are updated,
 * and videos a moderator deleted stay deleted.
 *
 * Every reel belongs to the house account @researchreel_picks (users.is_system): it can't
 * sign in, gets no notifications and isn't ranked on the leaderboard.
 *
 * Sources: HackerTube (hackertube.org) list of videos recommended on Hacker News,
 * ODC-By 1.0, which needs credit to HackerTube (shown on each reel and on the Help page),
 * plus YouTube searches on research topics. The videos themselves belong to their channels.
 */
require('dotenv').config({ quiet: true });
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const db = require('../config/db');

const SYSTEM_USER = {
  username: 'researchreel_picks',
  email: 'picks@researchreel.invalid',
  full_name: 'ResearchReel Picks',
  bio: 'Talks, lectures and explainers worth your time, played from YouTube. Videos belong to their creators. Curated with HackerTube (hackertube.org).',
};
const YT_ID = /^[A-Za-z0-9_-]{11}$/;

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
const file = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--limit') || path.join(__dirname, '../../data/youtube_picks.jsonl.gz');
const limit = opt('--limit') ? Number(opt('--limit')) : Infinity;
const dryRun = flag('--dry-run');
const prune = flag('--prune');

const readRows = (p) => {
  const raw = fs.readFileSync(p);
  const text = p.endsWith('.gz') ? zlib.gunzipSync(raw).toString('utf8') : raw.toString('utf8');
  return text.split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l));
};

const noteField = (notes, key) => {
  const m = String(notes || '').match(new RegExp(`(?:^|; )${key}=([^;]*)`));
  return m ? m[1].trim() : '';
};
const slugTag = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 40);
const clip = (s, n) => { const t = String(s || '').trim(); return t.length > n ? `${t.slice(0, n - 1)}…` : t; };

/** Converts a dataset row into a reel. Returns null for rows we shouldn't import. */
const toReel = (r) => {
  if (!YT_ID.test(r.id || '') || !r.title) return null;
  const fromHackerTube = r.source === 'hackertube';
  const channel = String(r.creator || '').replace(/ and \d+ more$/, '').trim() || 'YouTube';
  const why = noteField(r.notes, 'why_hn');
  const categories = noteField(r.notes, 'categories').split(';').map((c) => c.trim()).filter(Boolean);
  const description = [r.description, fromHackerTube && why ? `Why people recommend it: ${why}` : ''].filter(Boolean).join('\n\n');
  const tags = [...new Set([slugTag(r.topic), ...categories.map(slugTag)].filter(Boolean))].slice(0, 5);
  return {
    external_id: r.id,
    title: clip(r.title, 200),
    description: clip(description, 2000),
    video_url: `https://www.youtube-nocookie.com/embed/${r.id}`,
    thumbnail_url: `https://i.ytimg.com/vi/${r.id}/hqdefault.jpg`,
    tags,
    source_url: `https://www.youtube.com/watch?v=${r.id}`,
    source_channel: clip(channel, 200),
    source_license: 'Standard YouTube Licence (embedded)',
    source_attribution: fromHackerTube ? `${channel} on YouTube · picked via HackerTube` : `${channel} on YouTube`,
    source_dataset: fromHackerTube ? 'hackertube' : 'youtube_search',
    group: fromHackerTube ? (categories[0] || r.topic || 'other') : `yt:${r.topic || 'other'}`,
    score: fromHackerTube ? Number(noteField(r.notes, 'hn_score')) || 0 : 0,
  };
};

/** Round-robin across groups (best first within each) so neighbouring picks cover different subjects. */
const roundRobin = (items) => {
  const groups = new Map();
  for (const it of items) { if (!groups.has(it.group)) groups.set(it.group, []); groups.get(it.group).push(it); }
  const lists = [...groups.values()].map((g) => g.sort((a, b) => b.score - a.score)).sort((a, b) => b[0].score - a[0].score);
  const out = [];
  for (let i = 0; out.length < items.length; i++) for (const g of lists) if (g[i]) out.push(g[i]);
  return out;
};

/** Final order: three HackerTube picks, then one from the topic searches, repeated. */
const order = (reels) => {
  const ht = roundRobin(reels.filter((r) => r.source_dataset === 'hackertube'));
  const yt = roundRobin(reels.filter((r) => r.source_dataset !== 'hackertube'));
  const out = [];
  while (ht.length || yt.length) { out.push(...ht.splice(0, 3)); if (yt.length) out.push(yt.shift()); }
  return out;
};

const ensureSystemUser = async () => {
  const r = await db.query(
    `INSERT INTO users (email, username, full_name, bio, password_hash, email_verified, verification_status, is_system)
     VALUES ($1, $2, $3, $4, NULL, TRUE, 'verified', TRUE)
     ON CONFLICT (username) DO UPDATE SET is_system = TRUE, full_name = EXCLUDED.full_name, bio = EXCLUDED.bio, password_hash = NULL
     RETURNING id`,
    [SYSTEM_USER.email, SYSTEM_USER.username, SYSTEM_USER.full_name, SYSTEM_USER.bio]
  );
  return r.rows[0].id;
};

const COLS = ['author_id', 'title', 'description', 'video_url', 'thumbnail_url', 'tags', 'source_type', 'external_id', 'source_url',
  'source_channel', 'source_license', 'source_attribution', 'source_dataset', 'pick_rank', 'visibility', 'status'];

const upsertBatch = async (authorId, batch, startRank) => {
  const values = []; const params = [];
  batch.forEach((r, i) => {
    const row = [authorId, r.title, r.description, r.video_url, r.thumbnail_url, r.tags, 'youtube_embed', r.external_id, r.source_url,
      r.source_channel, r.source_license, r.source_attribution, r.source_dataset, startRank + i, 'public', 'published'];
    values.push(`(${row.map((_, j) => `$${params.length + j + 1}`).join(', ')})`);
    params.push(...row);
  });
  const r = await db.query(
    `INSERT INTO videos (${COLS.join(', ')}) VALUES ${values.join(', ')}
     ON CONFLICT (source_type, external_id) WHERE external_id IS NOT NULL DO UPDATE SET
       title = EXCLUDED.title, description = EXCLUDED.description, video_url = EXCLUDED.video_url,
       thumbnail_url = EXCLUDED.thumbnail_url, tags = EXCLUDED.tags, source_url = EXCLUDED.source_url,
       source_channel = EXCLUDED.source_channel, source_license = EXCLUDED.source_license,
       source_attribution = EXCLUDED.source_attribution, source_dataset = EXCLUDED.source_dataset, pick_rank = EXCLUDED.pick_rank
     RETURNING (xmax = 0) AS inserted`,
    params
  );
  return r.rows.filter((x) => x.inserted).length;
};

const main = async () => {
  const rows = readRows(file);
  const seen = new Set();
  const reels = rows.map(toReel).filter((r) => r && !seen.has(r.external_id) && seen.add(r.external_id));
  const ordered = order(reels).slice(0, limit);
  console.log(`${rows.length} rows read from ${path.basename(file)}; ${ordered.length} picks to import (${rows.length - reels.length} skipped).`);
  if (dryRun) {
    ordered.slice(0, 12).forEach((r, i) => console.log(`  ${String(i + 1).padStart(2)}. [${r.group}] ${r.title} (${r.source_channel})`));
    return;
  }
  const authorId = await ensureSystemUser();
  let inserted = 0;
  for (let i = 0; i < ordered.length; i += 400) inserted += await upsertBatch(authorId, ordered.slice(i, i + 400), i + 1);
  let pruned = 0;
  if (prune) {
    const r = await db.query(
      `UPDATE videos SET deleted_at = NOW() WHERE source_type = 'youtube_embed' AND deleted_at IS NULL AND NOT (external_id = ANY($1::text[]))`,
      [ordered.map((x) => x.external_id)]
    );
    pruned = r.rowCount;
  }
  console.log(`Done: ${inserted} new, ${ordered.length - inserted} updated${prune ? `, ${pruned} hidden` : ''}. Feed: /reels?tab=picks`);
};

if (require.main === module) {
  main().then(() => db.pool.end()).catch((err) => { console.error('Import failed:', err.message); db.pool.end().finally(() => process.exit(1)); });
}

module.exports = { toReel, order, readRows, ensureSystemUser, upsertBatch };
