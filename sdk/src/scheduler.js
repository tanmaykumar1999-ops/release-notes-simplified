







// Not reruired anymore since github actions will be used in place of scheduler.js








const { simplifyWithClaude, simplifierJava} = require('./releaseData');
const { fetchAndStoreLatestJavaRelease } = require('./fetchRawData');

// Fetches and simplifies the latest releases for Java,
// then calls updateCache (provided by index.js) to store the results.
const runScheduler = async function (updateCache) {
  console.log(`[Scheduler] Running at ${new Date().toISOString()}`);

  // --- Java ---
  try {
    const javaReleases = await simplifierJava();
    const simplifiedJava = [];
    if (!javaReleases.length) {
      console.warn('[Scheduler] Java: no releases fetched, keeping previous cache');
    } else {
    for (const release of javaReleases) {
      const simplified = await simplifyWithClaude(release);
      simplifiedJava.push({
        version: release.version,
        title: release.title,
        url: release.url,
        publishedAt: release.publishedAt,
        ...simplified,
      });
    }
  }

    updateCache('java', simplifiedJava);
    console.log(`[Scheduler] Java: cached ${simplifiedJava.length} releases`);
  } catch (err) {
    console.error('[Scheduler] Java fetch/simplify failed:', err.message);
  }

  // --- Signal fetch-latest-java-release.js to run ---
  // Runs after the Java/C++ cache refresh above completes, regardless of
  // whether either of those succeeded. Fetches the latest JDK release
  // notes page, parses it to JSON, and pushes it into Postgres. Wrapped
  // in its own try/catch so a failure here never crashes the scheduler.
  try {
    await fetchAndStoreLatestJavaRelease();
    console.log('[Scheduler] Latest Java release notes pushed to Postgres');
  } catch (err) {
    console.error('[Scheduler] fetch-latest-java-release run failed:', err.message);
  }
};

// Re-runs every 24 hours automatically
const INTERVAL_MS = 24 * 60 * 60 * 1000;
const startScheduler = async function (updateCache) {
  await runScheduler(updateCache); // immediate first run is triggered by index.js
  setInterval(() => runScheduler(updateCache), INTERVAL_MS);
};

module.exports = { runScheduler, startScheduler };