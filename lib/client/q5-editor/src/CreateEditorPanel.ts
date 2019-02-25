import * as Assert from 'assert';
import * as Monaco from 'monaco-editor/esm/vs/editor/editor.api.js';
import { Events, FileDeletedEvent } from './Events';
import { IEditorPanelOptions } from './Options';
import { Workspace } from './Workspace';

const SettingsApplicationPlaceholder = `# Application settings are available within function code

# KEY1=VALUE1
# KEY2=VALUE2`;

const SettingsComputePlaceholder = `# Compute settings control resources available to the executing function

# memory_size=128
# timeout=30`;

export function createEditorPanel(element: HTMLElement, workspace: Workspace, options?: IEditorPanelOptions) {
  Monaco.editor.defineTheme('customTheme', {
    base: 'vs', // can also be vs-dark or hc-black
    inherit: true, // can also be false to completely replace the builtin rules
    rules: [],
    colors: {
      // 'editor.background': '#212F3C',
      'scrollbar.shadow': '#ffffff',
      'editor.lineHighlightBackground': '#f7f9f9',
    },
  });

  const monacoOptions = {
    theme: 'customTheme',
    ...options,
    value: workspace.getSelectedFileContent(),
    language: workspace.getSelectedFileLanguage(),
    automaticLayout: true,
    minimap: {
      enabled: false,
    },
  };

  const editor = Monaco.editor.create(element, monacoOptions);
  let suppressNextChangeEvent: boolean;
  let activeCategory: Events = Events.FileSelected;
  let computeSettings: string | undefined;
  let applicationSettings: string | undefined;

  // When a file is selected in the workspace, update editor content and language
  workspace.on(Events.FileSelected, () => {
    suppressNextChangeEvent = true;
    activeCategory = Events.FileSelected;
    editor.setValue(workspace.getSelectedFileContent() || '');
    const model = editor.getModel();
    const language = workspace.getSelectedFileLanguage();
    if (model && language) {
      Monaco.editor.setModelLanguage(model, language);
    } else {
      Assert.fail('Model or language cannot be determined for the selected file.');
    }
    $(element).show();
  });

  // When the edited file is deleted, hide the editor
  workspace.on(Events.FileDeleted, (e: FileDeletedEvent) => {
    if (workspace.selectedFileName === e.fileName) {
      $(element).hide();
    }
  });

  // When runner is selected in the workspace, update editor content and language
  workspace.on(Events.RunnerSelected, () => {
    suppressNextChangeEvent = true;
    activeCategory = Events.RunnerSelected;
    editor.setValue(workspace.getRunnerContent());
    const model = editor.getModel();
    if (model) {
      Monaco.editor.setModelLanguage(model, 'javascript');
    } else {
      Assert.fail('Model cannot be determined the runner script.');
    }
    $(element).show();
  });

  // When compute settings are selected, serialize them and display as INI for editing
  workspace.on(Events.SettingsComputeSelected, _ => {
    suppressNextChangeEvent = true;
    activeCategory = Events.SettingsComputeSelected;
    computeSettings =
      computeSettings || serializeKeyValue(workspace.functionSpecification.lambda || {}, SettingsComputePlaceholder);
    editor.setValue(computeSettings);
    const model = editor.getModel();
    if (model) {
      Monaco.editor.setModelLanguage(model, 'ini');
    } else {
      Assert.fail('Model cannot be determined for compute node.');
    }
    $(element).show();
  });

  // When application settings are selected, serialize them and display as INI for editing
  workspace.on(Events.SettingsApplicationSelected, () => {
    suppressNextChangeEvent = true;
    activeCategory = Events.SettingsApplicationSelected;
    applicationSettings =
      applicationSettings ||
      serializeKeyValue(workspace.functionSpecification.configuration || {}, SettingsApplicationPlaceholder);
    editor.setValue(applicationSettings);
    const model = editor.getModel();
    if (model) {
      Monaco.editor.setModelLanguage(model, 'ini');
    } else {
      Assert.fail('Model cannot be determined for app settings node.');
    }
    $(element).show();
  });

  editor.onDidChangeModelContent(() => {
    if (!suppressNextChangeEvent) {
      switch (activeCategory) {
        case Events.FileSelected:
          workspace.setSelectedFileContent(editor.getValue());
          break;
        case Events.RunnerSelected:
          workspace.setRunnerContent(editor.getValue());
          break;
        case Events.SettingsComputeSelected:
          computeSettings = editor.getValue();
          workspace.setSettingsCompute(parseKeyValue(computeSettings));
          break;
        case Events.SettingsApplicationSelected:
          applicationSettings = editor.getValue();
          workspace.setSettingsApplication(parseKeyValue(applicationSettings));
          break;
      }
    } else {
      suppressNextChangeEvent = false;
    }
  });

  return workspace;
}

function parseKeyValue(data: string) {
  const param = /^\s*([^=]+?)\s*=\s*(.*?)\s*$/;
  const value: { [property: string]: string | number } = {};
  const lines = data.split(/[\r\n]+/);
  lines.forEach(line => {
    if (/^\s*\#/.test(line)) {
      return;
    }
    const match = line.match(param);
    if (match) {
      value[match[1]] = isNaN(+match[2]) ? match[2] : +match[2];
    }
  });
  return value;
}

function serializeKeyValue(data: { [property: string]: string | number }, placeholder: string) {
  const lines: string[] = [];
  Object.keys(data)
    .sort()
    .forEach(key => {
      lines.push(`${key}=${data[key]}`);
    });
  if (lines.length === 0) {
    return placeholder;
  }
  return lines.join('\n');
}
