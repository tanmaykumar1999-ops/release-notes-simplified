/**
 * fetch-latest-java-release.js
 * =============================
 * Fetching + orchestration ONLY. This file's one job is figuring out
 * which page holds the newest Java release notes and downloading its raw
 * HTML. It does not know how to turn HTML into JSON — that's entirely
 * parse-release-notes.js's job — and it does not know how to talk to
 * Postgres — that's entirely db.js's job. This file just wires the three
 * together.
 *
 * THE CHAIN (each step's output URL is the next step's input):
 *   1. getLatestMajorRelease() reads the index page, returns the newest
 *      major version's page (e.g. .../26u-relnotes.html).
 *   2. getPatchReleases(url) reads that page, returns every GA patch
 *      release listed on it (e.g. JDK 26.0.2, 26.0.1, ...), newest first.
 *   3. fetchHtml(patch.url) downloads the actual release notes page.
 *   4. parseReleaseNotesToJson(html, url) [imported] converts it to JSON.
 *   5. saveReleaseNotes(record) [imported] pushes it into Postgres.
 *
 * Requires:  npm install cheerio pg
 * Run:       DATABASE_URL=postgres://user:pass@host:5432/db node fetch-latest-java-release.js
 */

const cheerio = require('cheerio');
const { parseReleaseNotesToJson } = require('./parseHTML'); // look in parseHTML.js for the actual parser
const { saveReleaseNotes, releaseExists, closePool } = require('../database/neondb');
const { simplifyWithClaude } = require('./releaseData');

const RELNOTES_INDEX_URL =
  'https://www.oracle.com/in/java/technologies/javase/jdk-relnotes-index.html';

// Some Oracle endpoints reject requests with no/unusual User-Agent header,
// so every fetch here sends one that looks like a normal Chrome browser.
const BROWSER_HEADERS = {
  'User-Agent':
    'Release notes simplified/1.0 '
};

/**
 * Downloads a page and returns its raw HTML as plain text. This is the
 * one function every fetch in this file goes through — it does not parse
 * anything beyond checking the HTTP response succeeded.
 * This code also retries for 3 times to establish a connection before throwing an error.
 * @param {string} url
 * @returns {Promise<string>}
 */
async function fetchHtml(url, maxRetries = 3) {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: BROWSER_HEADERS,
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      return await res.text();

    } catch (error) {
      lastError = error;

      console.error(
        `Fetch attempt ${attempt}/${maxRetries} failed for ${url}: ${error.message}`
      );

      if (attempt < maxRetries) {
        const delay = 1000 * 2 ** (attempt - 1);

        console.log(`Retrying in ${delay}ms...`);

        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw new Error(
    `Failed to fetch ${url} after ${maxRetries} attempts: ${lastError.message}`
  );
}

/**
 * STEP 1 — find the newest major JDK version listed on the index page.
 * This still uses cheerio, but only to locate a link — it's page
 * DISCOVERY (deciding what to fetch next), not the content parsing that
 * parse-release-notes.js is responsible for.
 * @returns {Promise<{version: number, title: string, url: string}>}
 */
async function getLatestMajorRelease() {
  const html = await fetchHtml(RELNOTES_INDEX_URL);
  const $ = cheerio.load(html);

  const releases = [];
  $('a').each((_, el) => {
    const text = $(el).text().trim();        // e.g. "JDK 26 Release notes"
    const href = $(el).attr('href');
    const match = text.match(/^JDK (\d+) Release [Nn]otes/);
    if (match && href) {
      releases.push({
        version: parseInt(match[1], 10),
        title: text,
        url: new URL(href, RELNOTES_INDEX_URL).toString()
      });
    }
  });

  if (releases.length === 0) {
    throw new Error('No "JDK <N> Release notes" links found — Oracle may have changed the page');
  }

  // Version numbers only increase over time, so the highest number is
  // reliably the newest release — safer than trusting element order.
  releases.sort((a, b) => b.version - a.version);
  return releases[0];
}

/**
 * STEP 2 — given a major-version page, find every GA patch release on it
 * and return them sorted newest first.
 * @param {string} majorReleaseUrl
 * @returns {Promise<Array<{version: string, url: string}>>}
 */
async function getPatchReleases(majorReleaseUrl) {
  const html = await fetchHtml(majorReleaseUrl);
  const $ = cheerio.load(html);

  const patches = [];
  $('li').each((_, li) => {
    const text = $(li).text().trim();          // e.g. "JDK 26.0.2 (GA)"
    const match = text.match(/^JDK ([\d.]+)\s*\(/);
    const href = $(li).find('a').first().attr('href');
    if (match && href) {
      patches.push({
        version: match[1],
        url: new URL(href, majorReleaseUrl).toString()
      });
    }
  });

  // "26.0.2" isn't a number, so compare version parts left to right
  // (major, then minor, then patch) instead of a plain numeric sort.
  const toParts = v => v.split('.').map(Number);
  patches.sort((a, b) => {
    const pa = toParts(a.version);
    const pb = toParts(b.version);
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
      const diff = (pb[i] || 0) - (pa[i] || 0);
      if (diff !== 0) return diff;
    }
    return 0;
  });

  return patches;
}

// I want to compare the patche version returend in the above function to compare with the version in the database and if the version is already present in the database then I want to skip the fetch and parse of the release notes for that version.

/**
 * Runs the full pipeline: discover latest major -> discover latest patch
 * -> fetch its raw HTML -> parse -> save to Postgres. This is the function
 * scheduler.js calls after its own run completes.
 * @returns {Promise<object>} everything gathered along the way, for logging/debugging
 */
async function fetchAndStoreLatestJavaRelease() {
  const latestMajor = await getLatestMajorRelease();

  const patches = await getPatchReleases(latestMajor.url);
  const latestPatch = patches[0];
  if (!latestPatch) {
    throw new Error(`No GA patch releases found under ${latestMajor.url}`);
  }

    const alreadyStored = await releaseExists(latestMajor.version, latestPatch.version);
 if (alreadyStored) {
    console.log(`[fetchRawData] JDK ${latestPatch.version} already in the database — skipping fetch/parse.`);
    return { latestMajor, latestPatch, skipped: true };
  }

  // Fetching's job ends here — everything past this line is handled by
  // the imported modules, not by this file.
  const html = await fetchHtml(latestPatch.url);
  const releaseNotes = parseReleaseNotesToJson(html, latestPatch.url);

  const rawContent = releaseNotes.sections
   .map(s => `${s.heading}\n${s.content.join('\n')}`)
    .join('\n\n');

  const simplified = await simplifyWithClaude({
    version: latestPatch.version,
    publishedAt: new Date().toISOString(),
    rawContent,
  });

  const savedRow = await saveReleaseNotes({
    majorVersion: latestMajor.version,
    patchVersion: latestPatch.version,
    url: releaseNotes.url,
    title: releaseNotes.title,
    sections: releaseNotes.sections,
    simplified
  });

  return { latestMajor, latestPatch, releaseNotes, savedRow };
}

// Only auto-run when this file is executed directly (node fetch-latest-java-release.js),
// not when it's require()'d elsewhere (e.g. by scheduler.js, which calls
// fetchAndStoreLatestJavaRelease() itself after its own run completes).
if (require.main === module) {
  fetchAndStoreLatestJavaRelease()
    .then(result => {
      console.log(JSON.stringify(result, null, 2));
    })
    .catch(err => {
      console.error(err.message);
      process.exitCode = 1;
    })
    .finally(() => {
      // Without this, the pg Pool keeps its sockets open and the process
      // never exits on its own after a one-off CLI run.
      closePool();
    });
}

module.exports = { getLatestMajorRelease, getPatchReleases, fetchAndStoreLatestJavaRelease };