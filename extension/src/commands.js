const vscode = require('vscode');
const { fetchSimplifiedNotes } = require('./api');
const { getLoadingHtml, getWebviewHtml, getErrorHtml } = require('./webview');

async function handleShowLanguages(context) {
  const language = await vscode.window.showQuickPick(
    ['Java', 'Python', 'Golang'],
    { placeHolder: 'Select a language to view simplified release notes' }
  );
  if (!language) return; // user pressed Esc

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

module.exports = { handleShowLanguages };