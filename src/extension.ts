import {
  CompletionItem,
  ExtensionContext,
  languages,
  Position,
  TextDocument,
  workspace
} from 'vscode';

export async function activate(context: ExtensionContext) {

  const configFilePath = `${workspace.rootPath}/labelsFinder.json`;
  const configFile = await require(configFilePath);
  const ptBRJSON = await require(`${workspace.rootPath}/${configFile.labelsPath}`);
  const documentSelector = configFile.documentSelector;
  const { registerCompletionItemProvider } = languages;

  let provider = registerCompletionItemProvider(documentSelector, {
    provideCompletionItems() {

      let completionItems: CompletionItem[] = [];

      for (let key in ptBRJSON) {
        let completionItem = new CompletionItem(key);
        completionItem.commitCharacters = ['.'];
        completionItems.push(completionItem);
      }

      return [...completionItems];
    }

  });

  let providerChildren = registerCompletionItemProvider(
    documentSelector,
    {
      provideCompletionItems(document: TextDocument, position: Position) {

        let isNodeFound = false;
        let completionItems: CompletionItem[] = [];
        let linePrefix = document.lineAt(position).text.substr(0, position.character);

        const searchNode = (currentNode: any, JSONPath: string) => {
          if (isNodeFound) {
            return;
          }

          if (linePrefix.endsWith(`${JSONPath}.`)) {
            isNodeFound = true;

            if (typeof currentNode === 'object') {
              for (let key in currentNode) {
                let completionItem = new CompletionItem(key);
                let childrenValue = currentNode[key];

                if (typeof childrenValue === 'object') {
                  completionItem.commitCharacters = ['.'];
                } else {
                  completionItem.documentation = childrenValue;
                }
                completionItems.push(completionItem);
              }
            }
          } else if (typeof currentNode === 'object') {
            for (let key in currentNode) {
              searchNode(currentNode[key], `${JSONPath}.${key}`);
            }
          }
        };

        for (let key in ptBRJSON) {
          searchNode(ptBRJSON[key], key);
        }

        return isNodeFound ? completionItems : undefined;
      }
    },
    '.'
  );

  context.subscriptions.push(provider, providerChildren);
}
