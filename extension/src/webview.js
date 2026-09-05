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

function getWebviewHtml(language, release) {
  const data = release.simplifiedData || {};

  const features = (data.features || []).map(f => `
    <li>
      <strong>${escapeHtml(f.title)}</strong>
      <p>${escapeHtml(f.summary)}</p>
      ${f.example ? `<pre>${escapeHtml(f.example)}</pre>` : ''}
    </li>
  `).join('');

  const deprecations = (data.deprecations || []).map(d => `
    <li><strong>${escapeHtml(d.title)}</strong><p>${escapeHtml(d.summary)}</p></li>
  `).join('');

  const migrationTips = (data.migrationTips || []).map(t => `<li>${escapeHtml(t)}</li>`).join('');

  return `
    <html>
      <body style="font-family: sans-serif; padding: 1rem;">
        <h2>${escapeHtml(language)} — v${escapeHtml(release.version)}</h2>
        <p><em>Updated ${new Date(release.createdAt).toLocaleDateString()}</em></p>
        <p>${escapeHtml(data.tagline || '')}</p>
        ${features ? `<h3>Features</h3><ul>${features}</ul>` : ''}
        ${deprecations ? `<h3>Deprecations</h3><ul>${deprecations}</ul>` : ''}
        ${migrationTips ? `<h3>Migration tips</h3><ul>${migrationTips}</ul>` : ''}
      </body>
    </html>
  `;
}

module.exports = { getLoadingHtml, getErrorHtml, getWebviewHtml };