import * as vscode from 'vscode';

export async function activate(context: vscode.ExtensionContext) {

	const configFilePath = `${vscode.workspace.rootPath}/labelsFinder.json`;
	const configFile = await require(configFilePath);
	const ptBRJSON = await require(`${vscode.workspace.rootPath}/${configFile.labelsPath}`);
	const documentSelector = ['javascript', 'typescript'];
	let providers = [];

	let provider = vscode.languages.registerCompletionItemProvider(documentSelector, {

		provideCompletionItems() {

			let completionItems: Array<vscode.CompletionItem> = [];
			for (let key in ptBRJSON) {
				let completionItem = new vscode.CompletionItem(key);
				completionItem.commitCharacters = ['.'];
				completionItems.push(completionItem);
			}

			return completionItems;
		}
	});

	providers.push(provider);

	for (let key in ptBRJSON) {

		let currentObj = ptBRJSON[key];

		let provider2 = vscode.languages.registerCompletionItemProvider(
			documentSelector,
			{
				provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {

					let completionItems: vscode.CompletionItem[] = [];

					let linePrefix = document.lineAt(position).text.substr(0, position.character);

					if (linePrefix.endsWith(`${key}.`)) {
						for (let key2 in currentObj) {
							let completionItem = new vscode.CompletionItem(key2);
							
							if (typeof currentObj[key2] === 'object') {
								completionItem.commitCharacters = ['.'];
							} else {
								completionItem.documentation = currentObj[key2];
							}
							
							completionItems.push(completionItem);
						}
					} else {
						return undefined;
					}

					return completionItems;
				}
			},
			'.'
		);
		providers.push(provider2);
	}

	context.subscriptions.push(...providers);
}