'use strict';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export async function activate(context: vscode.ExtensionContext) {

	const collection = vscode.languages.createDiagnosticCollection('techenablers-bestpratices'); 

	let urlTf     = await vscode.workspace.findFiles('**/infra/terraform/inventories/prod/**'); 
	let urlCf1    = await vscode.workspace.findFiles('**/infra/prod/**');
	let urlCf2 	  = await vscode.workspace.findFiles('**/infra/parameters-prod.json');
	let urlDocker = await vscode.workspace.findFiles('**/app/Dockerfile');
	let urlPipes  = await vscode.workspace.findFiles('**/.iupipes.yml');
	let listUrls  = []

	listUrls.push(urlTf, urlCf1, urlCf2, urlDocker, urlPipes) ;

	for (let urllist of listUrls) {
		for (let urlDetails of urllist)
		{
			updateDiagnostics(urlDetails, collection, urlPipes);
		}	
	}

	context.subscriptions.push(vscode.workspace.onDidSaveTextDocument(editor => {
		if (editor) {
			updateDiagnostics(editor.uri, collection, urlPipes);
		}
	}));

	context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(editor => {
		if (editor) {
			updateDiagnostics(editor.document.uri, collection, urlPipes);
		}
	}));
}

function updateDiagnostics(document: vscode.Uri, collection: vscode.DiagnosticCollection, iupipesFile: any): void {

	const lines = document.fsPath.split('\infra');
	let environmentList: any = [];
	let template = null;
	
	for (let iupipes of iupipesFile)
	{
		template = findTemplate(iupipes.fsPath);
		if (iupipes.fsPath.includes(lines[0]) && template){
			environmentList = getEnvironmentAccount(iupipes.fsPath);
		} 
	}

	let pathFound = path.basename(document.fsPath).toLowerCase();
	let pathsToSearchEnvironments = ['terraform.tfvars','parameters-prod.json','parameters.json']
	let pathsToSearchConfigs = ['dockerfile','.iupipes.yml']
	let positions = [];
	let textToFind = [];
	const diagnostics = [];

	if (document && pathsToSearchEnvironments.includes(pathFound) && document.fsPath.toLowerCase().includes('prod')) {
		
		let directoryPath = document.fsPath;
		
		//VARIAVEIS DE AMBIENTE
		textToFind = ['hom','dev'];
		positions  = findText(textToFind, directoryPath);

		for (let position of positions) {
			if (position.line.includes('hom') || position.line.includes('dev')) {
				const range = new vscode.Range(position.position, position.position.translate(0, position.filePath.length));
				diagnostics.push({
					code: '',
					message: position.parametro + ' apontando para ' + position.name,
					range: range,
					severity: vscode.DiagnosticSeverity.Error,
					source: '',
				});
			}
		}

		//PARAMETRIZACAO
		textToFind = ['retention','desired','min','max','grace','cooldown'];
	    positions  = findText(textToFind, directoryPath);

		for (let position of positions) {

			//RETENTION
			if (position.parametro.includes('retention') && parseInt(position.line.replace(':','')) < 10) {
				const range = new vscode.Range(position.position, position.position.translate(0, position.filePath.length));
				diagnostics.push({
					code: '',
					message: position.parametro + ' inferior a 10 dias',
					range: range,
					severity: vscode.DiagnosticSeverity.Warning,
					source: '',
				});
			}

			//DESIRED E MIN
			if ((position.parametro.includes('desired') || position.parametro.includes('min') || position.parametro.includes('minimum')) && (position.parametro.includes('task') || position.parametro.includes('capacity') || position.parametro.includes('count')) && parseInt(position.line.replace('"','')) < 3) {
				const range = new vscode.Range(position.position, position.position.translate(0, position.filePath.length));
				diagnostics.push({
					code: '',
					message: position.parametro + ' inferior a 3.',
					range: range,
					severity: vscode.DiagnosticSeverity.Warning,
					source: '',
				});
			}

			//MAX
			if ((position.parametro.includes('max') || position.parametro.includes('maximum')) && (position.parametro.includes('task') || position.parametro.includes('capacity') || position.parametro.includes('count')) && parseInt(position.line.replace('"','')) > 70) {
				const range = new vscode.Range(position.position, position.position.translate(0, position.filePath.length));
				diagnostics.push({
					code: '',
					message: position.parametro + ' superior a 70.',
					range: range,
					severity: vscode.DiagnosticSeverity.Warning,
					source: '',
				});
			}

			//GRACE
			if (position.parametro.includes('grace') && parseInt(position.line.replace('"','')) >= 200) {
				const range = new vscode.Range(position.position, position.position.translate(0, position.filePath.length));
				diagnostics.push({
					code: '',
					message: position.parametro + ' superior a 200s, favor verificar.',
					range: range,
					severity: vscode.DiagnosticSeverity.Warning,
					source: '',
				});
			}

			//COOLDOWN
			if (position.parametro.includes('cooldown') && (parseInt(position.line.replace('"','')) >= 700 || parseInt(position.line.replace('"','')) <= 200)) {
				const range = new vscode.Range(position.position, position.position.translate(0, position.filePath.length));
				diagnostics.push({
					code: '',
					message: position.parametro + ' com valores não recomendados, favor verificar.',
					range: range,
					severity: vscode.DiagnosticSeverity.Warning,
					source: '',
				});
			}
		}

		//ESPAÇOS EM BRANCO 
	    textToFind = ['subnet'];
	    positions  = findText(textToFind, directoryPath);

		for (let position of positions) {
			if (position.parametro.includes('subnet')) {
				let lines = position.line.split(',');
				for (let line of lines){
					line = line.replace('[','').replace(']','').trim();
					if (line.includes(' ')){
						const range = new vscode.Range(position.position, position.position.translate(0, position.filePath.length));
						diagnostics.push({
							code: '',
							message: position.parametro + ' com espaçamentos.',
							range: range,
							severity: vscode.DiagnosticSeverity.Error,
							source: '',
						});
					}
				}
			}
		}

		//MINIMO 3 AZS
		let listSubnets = [];

		for (let position of positions) {
			if (position.parametro.includes('subnet')) {
				if (position.line.includes('subnet') && position.line.includes('[')){
					const lines = position.line.split(',');
					if (lines.length < 3) {
						const range = new vscode.Range(position.position, position.position.translate(0, position.filePath.length));
						diagnostics.push({
							code: '',
							message: 'Configuracão com menos de 3 subnets.',
							range: range,
							severity: vscode.DiagnosticSeverity.Warning,
							source: '',
						});
					}
				} else {
					listSubnets.push(position.line)
				}
			}
		}

		if (listSubnets.length < 3 && listSubnets.length != 0) {
			for (let subnet of listSubnets) {
				if (subnet.includes('subnet')){
					const range = new vscode.Range(positions[0].position, positions[0].position.translate(0, positions[0].filePath.length));
					diagnostics.push({
						code: '',
						message: 'Configuracão com menos de 3 subnets.',
						range: range,
						severity: vscode.DiagnosticSeverity.Warning,
						source: '',
					});
				}
			}
		}

		textToFind = ['vpc'];
	    positions  = findText(textToFind, directoryPath);

		for (let position of positions) {
			if (position.parametro.includes('vpc') && position.line.includes(' ')) {
				const range = new vscode.Range(position.position, position.position.translate(0, position.filePath.length));
				diagnostics.push({
					code: '',
					message: position.parametro + ' com espaçamentos.',
					range: range,
					severity: vscode.DiagnosticSeverity.Error,
					source: '',
				});
			}
		}
		

		//KEY EXPOSTAS
	    textToFind = ['token','accesskey','password'];
	    positions  = findText(textToFind, directoryPath);

		for (let position of positions) {
			if (position.parametro.includes('token') || position.parametro.includes('accesskey') || position.parametro.includes('password')) {
				if (!position.line.includes('secret')){
					const range = new vscode.Range(position.position, position.position.translate(0, position.filePath.length));
					diagnostics.push({
						code: '',
						message: position.parametro + ' com chave exposta.',
						range: range,
						severity: vscode.DiagnosticSeverity.Warning,
						source: '',
					});
				}
			}
		}

		//ENVIRONMENT DEV E HOM
		if (environmentList.length > 0) {
			environmentList.forEach((env: { environment: string; account: string; }) => {
				if (env.environment != 'prod') {
					textToFind = [env.account];
	    			positions  = findText(textToFind, directoryPath);
					
					for (let position of positions) {
						if (position.line.replace('"','').replace('"','').includes(env.account)) {
							const range = new vscode.Range(position.position, position.position.translate(0, position.filePath.length));
							diagnostics.push({
								code: '',
								message: position.parametro + ' com account de ' + env.environment,
								range: range,
								severity: vscode.DiagnosticSeverity.Error,
								source: '',
							});
						}
					}
				}
			});
		}

		//MEMORIA E CPU
	    textToFind = ['memory','cpu'];
	    positions  = findText(textToFind, directoryPath);

		for (let position of positions) {
			if ((position.parametro.includes('memory') || position.parametro.includes('cpu')) && !position.parametro.includes('reservation') ) {
				if (parseInt(position.line.replace('"','').replace('"','')) < 512){
					const range = new vscode.Range(position.position, position.position.translate(0, position.filePath.length));
					diagnostics.push({
						code: '',
						message: position.parametro + ' inferior a 512, favor verificar.',
						range: range,
						severity: vscode.DiagnosticSeverity.Warning,
						source: '',
					});
				}
			}
		}

		//CAPACITY PROVIDER
	    textToFind = ['provider']
	    positions  = findText(textToFind, directoryPath);

		for (let position of positions) {
			if (position.parametro.includes('capacity')) {
				if (position.line.includes('spot')){
					const range = new vscode.Range(position.position, position.position.translate(0, position.filePath.length));
					diagnostics.push({
						code: '',
						message: position.parametro + ' utilizando SPOT em prod.',
						range: range,
						severity: vscode.DiagnosticSeverity.Warning,
						source: '',
					});
				}
			}
		}

		//HEALTHCHECK
	    textToFind = ['health'];
	    positions  = findText(textToFind, directoryPath);

		for (let position of positions) {
			if (position.parametro.includes('check') && position.parametro.includes('start')) {
				if (parseInt(position.line.replace('"','').replace('"','')) >= 50){
					const range = new vscode.Range(position.position, position.position.translate(0, position.filePath.length));
					diagnostics.push({
						code: '',
						message: position.parametro + ' acima do recomendado, favor verificar.',
						range: range,
						severity: vscode.DiagnosticSeverity.Warning,
						source: '',
					});
				}
			} else if (position.parametro.includes('check') && position.parametro.includes('interval')) {
				if (parseInt(position.line.replace('"','').replace('"','')) >= 30){
					const range = new vscode.Range(position.position, position.position.translate(0, position.filePath.length));
					diagnostics.push({
						code: '',
						message: position.parametro + ' acima do recomendado, favor verificar.',
						range: range,
						severity: vscode.DiagnosticSeverity.Warning,
						source: '',
					});
				}
			} else if (position.parametro.includes('check') && position.parametro.includes('threshold')) {
				if (parseInt(position.line.replace('"','').replace('"','')) >= 7 || parseInt(position.line.replace('"','').replace('"','')) <= 1){
					const range = new vscode.Range(position.position, position.position.translate(0, position.filePath.length));
					diagnostics.push({
						code: '',
						message: position.parametro + ' não recomendado, favor verificar.',
						range: range,
						severity: vscode.DiagnosticSeverity.Warning,
						source: '',
					});
				}
			} 
		} 
	} else if (document && pathsToSearchConfigs.includes(pathFound.toLowerCase()))  {

		let directoryPath = document.fsPath;
		let textToFind = [];
		let positions  = []; 

		//DOCKERFILE
		textToFind = ['ENTRYPOINT'];
		positions  = findTextDocker(textToFind, directoryPath);

		for (let position of positions) {
			if (position.parametro.toUpperCase().includes('ENTRYPOINT') && !position.line.trim().startsWith('#')) {
				if (!position.line.includes('java_opts') && (!position.line.includes('xmx') || !position.line.includes('xms')) && !position.line.includes('maxram')){
					const range = new vscode.Range(position.position, position.position.translate(0, position.filePath.length));
					diagnostics.push({
						code: '',
						message: 'Dockerfile com JVM Options não configurada.',
						range: range,
						severity: vscode.DiagnosticSeverity.Warning,
						source: '',
					});
				}
			}
		}

		//IUPIPES
		textToFind = ['email'];
		positions  = findText(textToFind, directoryPath);

		for (let position of positions) {
			if (position.parametro.toLowerCase().includes('email')) {
				if (position.line.includes('email') || position.line.replace('"','').replace('"','') === ''){
					const range = new vscode.Range(position.position, position.position.translate(0, position.filePath.length));
					diagnostics.push({
						code: '',
						message: position.parametro + ' com email incorreto.',
						range: range,
						severity: vscode.DiagnosticSeverity.Warning,
						source: '',
					});
				}
			}
		}

	} else {
		collection.clear();
	}
	
	collection.set(document, diagnostics);
}

function getEnvironmentAccount(filePath: string)
{
	const fileContent = fs.readFileSync(filePath, 'utf-8');
	const lines = fileContent.split('\n');
	let currentEnvironment = '';
	let currentAccount = '';
	let envs = ['dev','hom','prod'];
	let listEnvironment = [];

	for (let i=0; i < lines.length; i++) {
		const line = lines[i].trim();

		for (let env of envs) {
			if (line.startsWith(env + ':')) {
				currentEnvironment = env;
			} else if (currentEnvironment === env && line.startsWith('account:')) {
				currentAccount = line.split(':')[1].trim().replace(/'/g, '').replace('"','').replace('"','');
				if (currentAccount.includes('#')) {
					currentAccount = currentAccount.substring(0, currentAccount.indexOf('#')).trim();
				}
				listEnvironment.push({ environment: currentEnvironment, account: currentAccount});
				break;
			}
		}
	}
	return listEnvironment
}

function findText(text: string[], filePath: string) {

	const results: { filePath: string; position: vscode.Position; line: string; name: any; parametro: string; }[] = [];
	
	function searchInFile(filePath: string)
	{
		const fileContent = fs.readFileSync (filePath, 'utf-8'); 
		const lines = fileContent.split('\n');
		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			for (let j = 0; j < text.length; j++) {
				const name = text[j].toLowerCase();
				const lineLower = line.toLowerCase(); 
				const column = lineLower.indexOf(name);
				if (column !== -1) {
					const position = new vscode.Position(i, column); 
					if (filePath.includes('.tfvars')) {
						const parametro = line.substring(0, line.indexOf('=')).replace('"','').trim().replace('"','').toLowerCase();
						let valor = line.substring(line.indexOf('=') + 1).trim();
						if (parametro.trim().startsWith('#') || parametro.trim().startsWith('//')) {
							break;
						} else {
							if (valor.includes('##')) {
								valor = valor.substring(0, valor.indexOf('##')).trim();
							}
							results.push({filePath, position, line: valor.toLowerCase(), name, parametro});
						}
					} else {
						const parametro = line.substring(0, line.indexOf(':')).replace('"','').trim().replace('"','').toLowerCase();
						const valor = line.substring(line.indexOf(':') + 1).trim().replace(',','');
						results.push({filePath, position, line: valor.toLowerCase(), name, parametro});
					}
				}
			}
		}
	}
	searchInFile(filePath);
	return results;
}

function findTextDocker(text: string[], filePath: string) {

	const results: { filePath: string; position: vscode.Position; line: string; name: any; parametro: string; }[] = [];
	
	function searchInFile(filePath: string)
	{
		const fileContent = fs.readFileSync (filePath, 'utf-8'); 
		const lines = fileContent.split('\n');
		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			if (!line.trim().startsWith('#'))
			{
				for (let j = 0; j < text.length; j++) {
					const name = text[j].toLowerCase();
					const lineLower = line.toLowerCase(); 
					const column = lineLower.indexOf(name);
					if (column !== -1) {
						const position = new vscode.Position(i, column); 
						const parametro = line.substring(0, line.indexOf('[')).replace('"','').trim().replace('"','');
						const valor = line.substring(line.indexOf('[') + 1).trim();
						results.push({filePath, position, line: valor.toLowerCase(), name, parametro});
					}
				}
			}
		}
	}
	searchInFile(filePath);
	return results;
}

function findTemplate(filePath: string) {

	const fileContent = fs.readFileSync(filePath, 'utf-8');
	const lines = fileContent.split('\n');
	let templates = ['ecs','cloudformation'];
	let count = 0;

	for (let i=0; i < lines.length; i++) {
		const line = lines[i].trim();

		for (let template of templates) {
			if (line.startsWith(template + ':')) {
				count = count + 1;
			} 
		}
	}

	if (count > 0) {
		return true;
	} else {
		return false;
	}
}
	
