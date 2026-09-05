const vscode = require('vscode');
const { handleShowLanguages } = require('./src/commands');

function activate(context) {
  const disposable = vscode.commands.registerCommand(
    'releaseNotesSimplified.showLanguages',
    () => handleShowLanguages(context)
  );
  context.subscriptions.push(disposable);
}

function deactivate() {}

module.exports = { activate, deactivate };