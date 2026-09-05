const BASE_URL = 'https://release-notes-simplifier-production.up.railway.app';

async function fetchSimplifiedNotes(language) {
  const res = await fetch(`${BASE_URL}/releases/java`);
  if (!res.ok) {
    throw new Error(`Backend returned ${res.status}`);
  }
  return res.json(); // { version, simplifiedSummary, updatedAt }
}

module.exports = { fetchSimplifiedNotes };