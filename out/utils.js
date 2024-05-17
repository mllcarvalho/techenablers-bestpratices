'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateDiagnostics = exports.findFiles = void 0;
const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
async function findFiles(pattern) {
    return vscode.workspace.findFiles(pattern);
}
exports.findFiles = findFiles;
function updateDiagnostics(document, collection) {
    const lines = document.fsPath.split('\infra');
    let environmentList = getEnvironmentAccount(document.fsPath);
    const diagnostics = [];
    const pathFound = path.basename(document.fsPath).toLowerCase();
    const pathsToSearchEnvironments = ['terraform.tfvars', 'parameters-prod.json', 'parameters.json'];
    const pathsToSearchConfigs = ['dockerfile', '.iupipes.yml'];
    if (document && pathsToSearchEnvironments.includes(pathFound) && document.fsPath.toLowerCase().includes('prod')) {
        analyzeEnvironmentFiles(document, diagnostics, environmentList);
    }
    else if (document && pathsToSearchConfigs.includes(pathFound)) {
        analyzeConfigFiles(document, diagnostics);
    }
    else {
        collection.clear();
    }
    collection.set(document, diagnostics);
}
exports.updateDiagnostics = updateDiagnostics;
function analyzeEnvironmentFiles(document, diagnostics, environmentList) {
    const directoryPath = document.fsPath;
    let textToFind = ['hom', 'dev'];
    let positions = findText(textToFind, directoryPath);
    positions.forEach(position => {
        if (position.line.includes('hom') || position.line.includes('dev')) {
            const range = new vscode.Range(position.position, position.position.translate(0, position.filePath.length));
            diagnostics.push(createDiagnostic(position, range, vscode.DiagnosticSeverity.Error, `${position.parametro} apontando para ${position.name}`));
        }
    });
    textToFind = ['retention', 'desired', 'min', 'max', 'grace', 'cooldown'];
    positions = findText(textToFind, directoryPath);
    positions.forEach(position => analyzeParameter(position, diagnostics));
    analyzeSubnets(directoryPath, diagnostics);
    analyzeVpc(directoryPath, diagnostics);
    analyzeKeys(directoryPath, diagnostics);
    analyzeEnvironmentAccounts(environmentList, directoryPath, diagnostics);
    analyzeMemoryAndCpu(directoryPath, diagnostics);
    analyzeCapacityProvider(directoryPath, diagnostics);
    analyzeHealthCheck(directoryPath, diagnostics);
}
function analyzeConfigFiles(document, diagnostics) {
    const directoryPath = document.fsPath;
    if (path.basename(directoryPath).toLowerCase() === 'dockerfile') {
        const textToFind = ['ENTRYPOINT'];
        const positions = findTextDocker(textToFind, directoryPath);
        positions.forEach(position => {
            if (position.parametro.toUpperCase().includes('ENTRYPOINT') && !position.line.trim().startsWith('#')) {
                if (!position.line.includes('java_opts') && (!position.line.includes('xmx') || !position.line.includes('xms')) && !position.line.includes('maxram')) {
                    const range = new vscode.Range(position.position, position.position.translate(0, position.filePath.length));
                    diagnostics.push(createDiagnostic(position, range, vscode.DiagnosticSeverity.Warning, 'Dockerfile com JVM Options não configurada.'));
                }
            }
        });
    }
    if (path.basename(directoryPath).toLowerCase() === '.iupipes.yml') {
        const textToFind = ['email'];
        const positions = findText(textToFind, directoryPath);
        positions.forEach(position => {
            if (position.parametro.toLowerCase().includes('email')) {
                if (position.line.includes('email') || position.line.replace('"', '').replace('"', '') === '') {
                    const range = new vscode.Range(position.position, position.position.translate(0, position.filePath.length));
                    diagnostics.push(createDiagnostic(position, range, vscode.DiagnosticSeverity.Warning, `${position.parametro} com email incorreto.`));
                }
            }
        });
    }
}
function analyzeParameter(position, diagnostics) {
    const range = new vscode.Range(position.position, position.position.translate(0, position.filePath.length));
    if (position.parametro.includes('retention') && parseInt(position.line.replace(':', '')) < 10) {
        diagnostics.push(createDiagnostic(position, range, vscode.DiagnosticSeverity.Warning, `${position.parametro} inferior a 10 dias`));
    }
    if ((position.parametro.includes('desired') || position.parametro.includes('min') || position.parametro.includes('minimum')) &&
        (position.parametro.includes('task') || position.parametro.includes('capacity') || position.parametro.includes('count')) &&
        parseInt(position.line.replace('"', '')) < 3) {
        diagnostics.push(createDiagnostic(position, range, vscode.DiagnosticSeverity.Warning, `${position.parametro} inferior a 3.`));
    }
    if ((position.parametro.includes('max') || position.parametro.includes('maximum')) &&
        (position.parametro.includes('task') || position.parametro.includes('capacity') || position.parametro.includes('count')) &&
        parseInt(position.line.replace('"', '')) > 70) {
        diagnostics.push(createDiagnostic(position, range, vscode.DiagnosticSeverity.Warning, `${position.parametro} superior a 70.`));
    }
    if (position.parametro.includes('grace') && parseInt(position.line.replace('"', '')) >= 200) {
        diagnostics.push(createDiagnostic(position, range, vscode.DiagnosticSeverity.Warning, `${position.parametro} superior a 200s, favor verificar.`));
    }
    if (position.parametro.includes('cooldown') && (parseInt(position.line.replace('"', '')) >= 700 || parseInt(position.line.replace('"', '')) <= 200)) {
        diagnostics.push(createDiagnostic(position, range, vscode.DiagnosticSeverity.Warning, `${position.parametro} com valores não recomendados, favor verificar.`));
    }
}
function analyzeSubnets(directoryPath, diagnostics) {
    let textToFind = ['subnet'];
    let positions = findText(textToFind, directoryPath);
    positions.forEach(position => {
        if (position.parametro.includes('subnet')) {
            const lines = position.line.split(',');
            lines.forEach(line => {
                line = line.replace('[', '').replace(']', '').trim();
                if (line.includes(' ')) {
                    const range = new vscode.Range(position.position, position.position.translate(0, position.filePath.length));
                    diagnostics.push(createDiagnostic(position, range, vscode.DiagnosticSeverity.Error, `${position.parametro} com espaçamentos.`));
                }
            });
            if (lines.length < 3) {
                const range = new vscode.Range(position.position, position.position.translate(0, position.filePath.length));
                diagnostics.push(createDiagnostic(position, range, vscode.DiagnosticSeverity.Warning, 'Configuração com menos de 3 subnets.'));
            }
        }
    });
    const listSubnets = positions.filter(position => position.parametro.includes('subnet')).map(position => position.line);
    if (listSubnets.length < 3 && listSubnets.length !== 0) {
        listSubnets.forEach(subnet => {
            if (subnet.includes('subnet')) {
                const range = new vscode.Range(positions[0].position, positions[0].position.translate(0, positions[0].filePath.length));
                diagnostics.push(createDiagnostic(positions[0], range, vscode.DiagnosticSeverity.Warning, 'Configuração com menos de 3 subnets.'));
            }
        });
    }
}
function analyzeVpc(directoryPath, diagnostics) {
    const textToFind = ['vpc'];
    const positions = findText(textToFind, directoryPath);
    positions.forEach(position => {
        if (position.parametro.includes('vpc') && position.line.includes(' ')) {
            const range = new vscode.Range(position.position, position.position.translate(0, position.filePath.length));
            diagnostics.push(createDiagnostic(position, range, vscode.DiagnosticSeverity.Error, `${position.parametro} com espaçamentos.`));
        }
    });
}
function analyzeKeys(directoryPath, diagnostics) {
    const textToFind = ['token', 'accesskey', 'password'];
    const positions = findText(textToFind, directoryPath);
    positions.forEach(position => {
        if (position.parametro.includes('token') || position.parametro.includes('accesskey') || position.parametro.includes('password')) {
            if (!position.line.includes('secret')) {
                const range = new vscode.Range(position.position, position.position.translate(0, position.filePath.length));
                diagnostics.push(createDiagnostic(position, range, vscode.DiagnosticSeverity.Warning, `${position.parametro} com chave exposta.`));
            }
        }
    });
}
function analyzeEnvironmentAccounts(environmentList, directoryPath, diagnostics) {
    environmentList.forEach(env => {
        if (env.environment !== 'prod') {
            const textToFind = [env.account];
            const positions = findText(textToFind, directoryPath);
            positions.forEach(position => {
                if (position.line.replace('"', '').replace('"', '').includes(env.account)) {
                    const range = new vscode.Range(position.position, position.position.translate(0, position.filePath.length));
                    diagnostics.push(createDiagnostic(position, range, vscode.DiagnosticSeverity.Error, `${position.parametro} com account de ${env.environment}`));
                }
            });
        }
    });
}
function analyzeMemoryAndCpu(directoryPath, diagnostics) {
    const textToFind = ['memory', 'cpu'];
    const positions = findText(textToFind, directoryPath);
    positions.forEach(position => {
        if ((position.parametro.includes('memory') || position.parametro.includes('cpu')) && !position.parametro.includes('reservation')) {
            if (parseInt(position.line.replace('"', '').replace('"', '')) < 512) {
                const range = new vscode.Range(position.position, position.position.translate(0, position.filePath.length));
                diagnostics.push(createDiagnostic(position, range, vscode.DiagnosticSeverity.Warning, `${position.parametro} inferior a 512, favor verificar.`));
            }
        }
    });
}
function analyzeCapacityProvider(directoryPath, diagnostics) {
    const textToFind = ['provider'];
    const positions = findText(textToFind, directoryPath);
    positions.forEach(position => {
        if (position.parametro.includes('capacity') && position.line.includes('spot')) {
            const range = new vscode.Range(position.position, position.position.translate(0, position.filePath.length));
            diagnostics.push(createDiagnostic(position, range, vscode.DiagnosticSeverity.Warning, `${position.parametro} utilizando SPOT em prod.`));
        }
    });
}
function analyzeHealthCheck(directoryPath, diagnostics) {
    const textToFind = ['health'];
    const positions = findText(textToFind, directoryPath);
    positions.forEach(position => {
        const range = new vscode.Range(position.position, position.position.translate(0, position.filePath.length));
        if (position.parametro.includes('check') && position.parametro.includes('start') && parseInt(position.line.replace('"', '').replace('"', '')) >= 50) {
            diagnostics.push(createDiagnostic(position, range, vscode.DiagnosticSeverity.Warning, `${position.parametro} acima do recomendado, favor verificar.`));
        }
        else if (position.parametro.includes('check') && position.parametro.includes('interval') && parseInt(position.line.replace('"', '').replace('"', '')) >= 30) {
            diagnostics.push(createDiagnostic(position, range, vscode.DiagnosticSeverity.Warning, `${position.parametro} acima do recomendado, favor verificar.`));
        }
        else if (position.parametro.includes('check') && position.parametro.includes('threshold') && (parseInt(position.line.replace('"', '').replace('"', '')) >= 7 || parseInt(position.line.replace('"', '').replace('"', '')) <= 1)) {
            diagnostics.push(createDiagnostic(position, range, vscode.DiagnosticSeverity.Warning, `${position.parametro} não recomendado, favor verificar.`));
        }
    });
}
function getEnvironmentAccount(filePath) {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const lines = fileContent.split('\n');
    const envs = ['dev', 'hom', 'prod'];
    const listEnvironment = [];
    let currentEnvironment = '';
    let currentAccount = '';
    lines.forEach(line => {
        line = line.trim();
        envs.forEach(env => {
            if (line.startsWith(`${env}:`)) {
                currentEnvironment = env;
            }
            else if (currentEnvironment === env && line.startsWith('account:')) {
                currentAccount = line.split(':')[1].trim().replace(/'/g, '').replace(/"/g, '');
                if (currentAccount.includes('#')) {
                    currentAccount = currentAccount.substring(0, currentAccount.indexOf('#')).trim();
                }
                listEnvironment.push({ environment: currentEnvironment, account: currentAccount });
            }
        });
    });
    return listEnvironment;
}
function findText(text, filePath) {
    const results = [];
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const lines = fileContent.split('\n');
    lines.forEach((line, i) => {
        text.forEach(name => {
            const lineLower = line.toLowerCase();
            const column = lineLower.indexOf(name);
            if (column !== -1) {
                const position = new vscode.Position(i, column);
                if (filePath.includes('.tfvars')) {
                    const parametro = line.substring(0, line.indexOf('=')).replace(/"/g, '').trim().toLowerCase();
                    let valor = line.substring(line.indexOf('=') + 1).trim();
                    if (!parametro.trim().startsWith('#') && !parametro.trim().startsWith('//')) {
                        if (valor.includes('##')) {
                            valor = valor.substring(0, valor.indexOf('##')).trim();
                        }
                        results.push({ filePath, position, line: valor.toLowerCase(), name, parametro });
                    }
                }
                else {
                    const parametro = line.substring(0, line.indexOf(':')).replace(/"/g, '').trim().toLowerCase();
                    const valor = line.substring(line.indexOf(':') + 1).trim().replace(',', '');
                    results.push({ filePath, position, line: valor.toLowerCase(), name, parametro });
                }
            }
        });
    });
    return results;
}
function findTextDocker(text, filePath) {
    const results = [];
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const lines = fileContent.split('\n');
    lines.forEach((line, i) => {
        if (!line.trim().startsWith('#')) {
            text.forEach(name => {
                const lineLower = line.toLowerCase();
                const column = lineLower.indexOf(name);
                if (column !== -1) {
                    const position = new vscode.Position(i, column);
                    const parametro = line.substring(0, line.indexOf('[')).replace(/"/g, '').trim();
                    const valor = line.substring(line.indexOf('[') + 1).trim();
                    results.push({ filePath, position, line: valor.toLowerCase(), name, parametro });
                }
            });
        }
    });
    return results;
}
function createDiagnostic(position, range, severity, message) {
    return {
        code: '',
        message: message,
        range: range,
        severity: severity,
        source: '',
    };
}
//# sourceMappingURL=utils.js.map