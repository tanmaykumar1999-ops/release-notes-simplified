const vscode = require('vscode');
const { fetchSimplifiedNotes } = require('./api');
const { getLoadingHtml, getWebviewHtml, getErrorHtml } = require('./webview');

async function handleShowJavaNotes(context) {
  const language = 'Java';

  const panel = vscode.window.createWebviewPanel(
    'releaseNotesSimplified',
    `${language} Release Notes (Simplified)`,
    vscode.ViewColumn.One,
    { enableScripts: false }
  );

  panel.webview.html = getLoadingHtml(language);

  try {
    const data = await fetchSimplifiedNotes(language.toLowerCase());
    panel.webview.html = getWebviewHtml(language, data);
  } catch (err) {
    panel.webview.html = getErrorHtml(err.message);
  }
}

module.exports = { handleShowJavaNotes };