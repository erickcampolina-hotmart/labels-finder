import { ExtensionContext, window, workspace, Disposable } from "vscode";
import { watchFile } from "fs";
import * as path from "path";

import { getProvider, getChildrenProvider, getTextProvider } from "./providers";

export async function activate(context: ExtensionContext) {
  const { showWarningMessage } = window;

  const configFileName = "labelsFinder.json";
  const configFilePath = path.resolve(
    `${workspace.rootPath}/${configFileName}`
  );

  let sourceFile: any;
  let provider: Disposable;
  let childrenProvider: Disposable;
  let textProvider: Disposable;
  let documentSelector: string | string[];
  let configFile: { labelsPath: string; documentSelector: string[] };

  try {
    configFile = await require(configFilePath);
  } catch {
    showWarningMessage(
      `Configuration file "${configFileName}" not found on root of your project.`
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

  try {
    documentSelector = configFile.documentSelector;
  } catch {
    showWarningMessage(
      `"documentSelector" not found on config file "${configFileName}"`
    );
    return;
  }

  const refreshProviders = () => {
    provider.dispose();
    childrenProvider.dispose();
    textProvider.dispose();

    provider = getProvider(sourceFile, documentSelector);
    childrenProvider = getChildrenProvider(sourceFile, documentSelector);
    textProvider = getTextProvider(sourceFile, documentSelector);

    context.subscriptions.push(provider, childrenProvider, textProvider);
  };

  watchFile(sourceFilePath, async () => {
    try {
      delete require.cache[sourceFilePath];
      sourceFile = await require(sourceFilePath);

      refreshProviders();
    } catch {
      showWarningMessage('Source file not find on specified "labelsPath".');
    }
  });

  watchFile(configFilePath, async () => {
    try {
      delete require.cache[configFilePath];
      delete require.cache[sourceFilePath];

      configFile = await require(configFilePath);
      sourceFilePath = path.resolve(
        `${workspace.rootPath}/${configFile.labelsPath}`
      );
      sourceFile = await require(sourceFilePath);
      documentSelector = configFile.documentSelector;

      refreshProviders();
    } catch {
      showWarningMessage(`Configuration file "${configFileName}" invalid.`);
    }
  });

  provider = getProvider(sourceFile, documentSelector);
  childrenProvider = getChildrenProvider(sourceFile, documentSelector);
  textProvider = getTextProvider(sourceFile, documentSelector);

  context.subscriptions.push(provider, childrenProvider, textProvider);
}
