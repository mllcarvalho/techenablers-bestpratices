'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = void 0;
const vscode = require("vscode");
const utils_1 = require("./utils");
// Add the missing import statement for the './utils' module
async function activate(context) {
    const collection = vscode.languages.createDiagnosticCollection('techenablers-bestpratices');
    const filesToCheck = [
        '**/infra/terraform/inventories/prod/**',
        '**/infra/prod/**',
        '**/infra/parameters-prod.json',
        '**/app/Dockerfile',
        '**/.iupipes.yml'
    ];
    const listUrls = await Promise.all(filesToCheck.map(pattern => vscode.workspace.findFiles(pattern)));
    listUrls.forEach(urllist => {
        urllist.forEach(url => (0, utils_1.updateDiagnostics)(url, collection));
    });
    context.subscriptions.push(vscode.workspace.onDidSaveTextDocument(editor => {
        if (editor)
            (0, utils_1.updateDiagnostics)(editor.uri, collection);
    }), vscode.window.onDidChangeActiveTextEditor(editor => {
        if (editor)
            (0, utils_1.updateDiagnostics)(editor.document.uri, collection);
    }));
}
exports.activate = activate;
//# sourceMappingURL=main.js.map