const BASE_URL = 'https://release-notes-simplifier-production.up.railway.app';

async function fetchSimplifiedNotes(language) {
  const res = await fetch(`${BASE_URL}/api/release-notes?language=${language}`);
  if (!res.ok) {
    throw new Error(`Backend returned ${res.status}`);
  }
  return res.json(); // { version, simplifiedSummary, updatedAt }
}

module.exports = { fetchSimplifiedNotes };