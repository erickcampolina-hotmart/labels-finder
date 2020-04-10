import {
  CompletionItem,
  CompletionItemKind,
  ExtensionContext,
  languages,
  Position,
  TextDocument,
  window,
  workspace,
} from "vscode";

export async function activate(context: ExtensionContext) {
  const { showWarningMessage } = window;
  const { registerCompletionItemProvider } = languages;

  const configFilePath = `${workspace.rootPath}/labelsFinder.json`;

  let configFile;
  let documentSelector;
  let sourceFile: { [key: string]: string };

  try {
    configFile = await require(configFilePath);
  } catch {
    showWarningMessage(
      'Configuration file "labelsFinder.json" not found on root of your project.'
    );
    return;
  }

  try {
    sourceFile = await require(`${workspace.rootPath}/${configFile.labelsPath}`);
  } catch {
    showWarningMessage('Source file not find on specified "labelsPath".');
    return;
  }

  try {
    documentSelector = configFile.documentSelector;
  } catch {
    showWarningMessage(
      '"documentSelector" not found on config file "labelsFinder.json"'
    );
    return;
  }

  let provider = registerCompletionItemProvider(documentSelector, {
    provideCompletionItems() {
      let completionItems: CompletionItem[] = [];

      for (let key in sourceFile) {
        let completionItem = new CompletionItem(key);
        completionItem.commitCharacters = ["."];
        completionItems.push(completionItem);
      }

      return [...completionItems];
    },
  });

  let providerChildren = registerCompletionItemProvider(
    documentSelector,
    {
      provideCompletionItems(document: TextDocument, position: Position) {
        let isNodeFound = false;
        let completionItems: CompletionItem[] = [];
        let linePrefix = document
          .lineAt(position)
          .text.substr(0, position.character);

        const searchNode = (currentNode: any, JSONPath: string) => {
          if (isNodeFound) {
            return;
          }

          if (linePrefix.endsWith(`${JSONPath}.`)) {
            isNodeFound = true;

            if (typeof currentNode === "object") {
              for (let key in currentNode) {
                let completionItem = new CompletionItem(key);
                let childrenValue = currentNode[key];

                if (typeof childrenValue === "object") {
                  completionItem.commitCharacters = ["."];
                  completionItem.kind = CompletionItemKind.Property;
                } else {
                  completionItem.detail = childrenValue;
                  completionItem.kind = CompletionItemKind.Field;
                }
                completionItems.push(completionItem);
              }
            }
          } else if (typeof currentNode === "object") {
            for (let key in currentNode) {
              searchNode(currentNode[key], `${JSONPath}.${key}`);
            }
          }
        };

        for (let key in sourceFile) {
          searchNode(sourceFile[key], key);
        }

        return isNodeFound ? completionItems : undefined;
      },
    },
    "."
  );

  context.subscriptions.push(provider, providerChildren);
}
