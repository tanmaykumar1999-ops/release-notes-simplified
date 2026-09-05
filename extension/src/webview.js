function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function getLoadingHtml(language) {
  return `<html><body><p>Loading ${escapeHtml(language)} release notes…</p></body></html>`;
}

function getErrorHtml(message) {
  return `<html><body><p>Couldn't load notes: ${escapeHtml(message)}</p></body></html>`;
}

function getWebviewHtml(language, data) {
  return `
    <html>
      <body style="font-family: sans-serif; padding: 1rem;">
        <h2>${escapeHtml(language)} — v${escapeHtml(data.version)}</h2>
        <p><em>Updated ${new Date(data.updatedAt).toLocaleDateString()}</em></p>
        <div>${escapeHtml(data.simplifiedSummary)}</div>
      </body>
    </html>
  `;
}

module.exports = { getLoadingHtml, getErrorHtml, getWebviewHtml };