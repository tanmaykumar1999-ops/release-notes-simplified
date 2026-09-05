const vscode = require('vscode');
const { handleShowJavaNotes } = require('./src/commands');

function activate(context) {
  const disposable = vscode.commands.registerCommand(
    'releaseNotesSimplified.showJava',
    () => handleShowJavaNotes(context)
  );
  context.subscriptions.push(disposable);
}

function deactivate() {}

module.exports = { activate, deactivate };