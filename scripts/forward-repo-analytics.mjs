#!/usr/bin/env node
/**
 * Fetches yesterday's GitHub traffic (views, clones, referrers, paths) and
 * forwards them to a self-hosted Plausible instance as custom events.
 *
 * GitHub's /traffic/* endpoints retain only 14 days; this job exists to
 * accumulate longer history in Plausible. Plausible records events at
 * receive-time (no backdating), so each run sends a single event per
 * category with the prior day's totals as props.
 *
 * Required env:
 *   GH_TRAFFIC_TOKEN     PAT with `repo` (or `Administration: read`)
 *   GITHUB_REPOSITORY    owner/repo (provided by Actions)
 *   PLAUSIBLE_DOMAIN     Plausible site name (e.g. pierrejanineh.github.io)
 *   PLAUSIBLE_ENDPOINT   POST URL (e.g. https://plausible.pierrejanineh.com/api/event)
 */

const {
  GH_TRAFFIC_TOKEN,
  GITHUB_REPOSITORY,
  PLAUSIBLE_DOMAIN,
  PLAUSIBLE_ENDPOINT,
} = process.env;

for (const [k, v] of Object.entries({
  GH_TRAFFIC_TOKEN,
  GITHUB_REPOSITORY,
  PLAUSIBLE_DOMAIN,
  PLAUSIBLE_ENDPOINT,
})) {
  if (!v) {
    console.error(`Missing required env: ${k}`);
    process.exit(1);
  }
}

const REPO_URL = `https://github.com/${GITHUB_REPOSITORY}`;
const UA = `repo-analytics-forwarder/1.0 (+${REPO_URL})`;
const FETCH_TIMEOUT_MS = 30_000;

async function gh(path) {
  const res = await fetch(`https://api.github.com/repos/${GITHUB_REPOSITORY}${path}`, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    headers: {
      Authorization: `Bearer ${GH_TRAFFIC_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': UA,
    },
  });
  if (!res.ok) {
    throw new Error(`GitHub ${path} → ${res.status} ${res.statusText}: ${await res.text()}`);
  }
  return res.json();
}

/**
 * Returns a deterministic loopback IP for the given event name so that
 * different event categories are not merged into a single Plausible visitor
 * session (Plausible deduplicates sessions by IP + User-Agent).
 */
function eventIp(name) {
  let hash = 0;
  for (const c of name) hash = (hash * 31 + c.charCodeAt(0)) >>> 0;
  return `127.0.${(hash >>> 8) & 0xff}.${hash & 0xff}`;
}

async function plausible(name, props) {
  const res = await fetch(PLAUSIBLE_ENDPOINT, {
    method: 'POST',
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': UA,
      // Plausible deduplicates by IP+UA; use a deterministic per-category
      // loopback IP so events from different categories aren't merged into a
      // single visitor session.
      'X-Forwarded-For': eventIp(name),
    },
    body: JSON.stringify({
      domain: PLAUSIBLE_DOMAIN,
      name,
      url: REPO_URL,
      props,
    }),
  });
  if (!res.ok) {
    throw new Error(`Plausible ${name} → ${res.status} ${res.statusText}: ${await res.text()}`);
  }
}

function yesterdayISO() {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

function pickDay(buckets, dateStr) {
  return buckets.find((b) => b.timestamp.slice(0, 10) === dateStr) ?? { count: 0, uniques: 0 };
}

const date = yesterdayISO();

const [views, clones, referrers, paths] = await Promise.all([
  gh('/traffic/views'),
  gh('/traffic/clones'),
  gh('/traffic/popular/referrers'),
  gh('/traffic/popular/paths'),
]);

const dayViews = pickDay(views.views ?? [], date);
const dayClones = pickDay(clones.clones ?? [], date);

await plausible('Repo Daily Views', {
  date,
  count: String(dayViews.count),
  uniques: String(dayViews.uniques),
});
await plausible('Repo Daily Clones', {
  date,
  count: String(dayClones.count),
  uniques: String(dayClones.uniques),
});

// Referrers and paths are 14-day rolling totals (not per-day). Send each as a
// separate event so Plausible's breakdown report can rank them.
for (const r of referrers ?? []) {
  await plausible('Repo Referrer', {
    date,
    referrer: r.referrer,
    count: String(r.count),
    uniques: String(r.uniques),
  });
}
for (const p of paths ?? []) {
  await plausible('Repo Path', {
    date,
    path: p.path,
    title: p.title ?? '',
    count: String(p.count),
    uniques: String(p.uniques),
  });
}

console.log(
  `Sent: views=${dayViews.count}/${dayViews.uniques} clones=${dayClones.count}/${dayClones.uniques} referrers=${(referrers ?? []).length} paths=${(paths ?? []).length} for ${date}`,
);
