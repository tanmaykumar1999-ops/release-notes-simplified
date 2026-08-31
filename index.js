const express = require('express');
const dotenv = require('dotenv');
dotenv.config();

const { fetchAndStoreLatestJavaRelease } = require('./sdk/src/fetchRawData');
const { findAllJavaReleases } = require('./sdk/database/neondb');

const app = express();
app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Called by the VS Code extension.
app.get('/releases/java', async (req, res) => {
  try {
    const releases = await findAllJavaReleases();
    if (!releases.length) {
      return res.status(503).json({ error: 'Java release data not yet available. Try again shortly.' });
    }
    res.json(releases.map(r => ({ ...r, simplifiedData: r.simplifiedData ? JSON.parse(r.simplifiedData) : null })));
  } catch (err) {
    console.error('[releases/java] failed:', err);
    res.status(500).json({ error: 'Failed to load release data.' });
  }
});

// Called only by the GitHub Actions cron.
app.post('/internal/sync', async (req, res) => {
  if (req.get('Authorization') !== `Bearer ${process.env.SYNC_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const result = await fetchAndStoreLatestJavaRelease();
    res.json({ status: 'ok', skipped: !!result.skipped });
  } catch (err) {
    console.error('[internal/sync] failed:', err);
    res.status(500).json({ error: 'Sync failed', message: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));