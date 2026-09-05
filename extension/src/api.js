const BASE_URL = 'https://release-notes-simplifier-production.up.railway.app';

async function fetchSimplifiedNotes(language) {
  const res = await fetch(`${BASE_URL}/releases/java`);
  if (!res.ok) {
    throw new Error(`Backend returned ${res.status}`);
  }
  const releases = await res.json(); // array, newest first
  const latest = releases[0];
  if (!latest) {
    throw new Error('No release data available yet.');
  }
  return latest; // { version, simplifiedData: { tagline, features, deprecations, migrationTips }, createdAt, ... }
}

module.exports = { fetchSimplifiedNotes };