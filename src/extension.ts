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
import { watchFile } from "fs";
import * as path from "path";

export async function activate(context: ExtensionContext) {
  const { showWarningMessage } = window;
  const { registerCompletionItemProvider } = languages;
  const configFilePath = `${workspace.rootPath}/labelsFinder.json`;

  let configFile: { labelsPath: string; documentSelector: string[] };
  let documentSelector;
  let sourceFile: any;

  try {
    configFile = await require(configFilePath);
  } catch {
    showWarningMessage(
      'Configuration file "labelsFinder.json" not found on root of your project.'
    );
    return;
  }

  let sourceFilePath = path.resolve(
    `${workspace.rootPath}/${configFile.labelsPath}`
  );

  try {
    sourceFile = await require(sourceFilePath);
  } catch {
    showWarningMessage('Source file not find on specified "labelsPath".');
    return;
  }

  watchFile(sourceFilePath, async () => {
    try {
      delete require.cache[sourceFilePath];
      sourceFile = await require(sourceFilePath);
    } catch {
      showWarningMessage('Source file not find on specified "labelsPath".');
    }
  });

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
