import { Workspace } from './Workspace';
import { Events, FileDeletedEvent } from './Events';
import * as Monaco from 'monaco-editor/esm/vs/editor/editor.api.js';
import { IEditorPanelOptions } from './Options';
import * as Assert from 'assert';

const SettingsApplicationPlaceholder = `# Application settings are available within function code

# KEY1=VALUE1
# KEY2=VALUE2`;

const SettingsComputePlaceholder = `# Compute settings control resources available to the executing function

# memory_size=128
# timeout=30`;

export function createEditorPanel(element: HTMLElement, workspace: Workspace, options?: IEditorPanelOptions) {
  Monaco.editor.defineTheme('customTheme', {
    base: 'vs-dark', // can also be vs-dark or hc-black
    inherit: true, // can also be false to completely replace the builtin rules
    rules: [],
    colors: {
      'editor.background': '#212F3C',
      'scrollbar.shadow': '#212f3c',
      'editor.lineHighlightBackground': '#283747',
    },
  });

  let monacoOptions = {
    theme: 'customTheme',
    ...options,
    value: workspace.getSelectedFileContent(),
    language: workspace.getSelectedFileLanguage(),
    automaticLayout: true,
    minimap: {
      enabled: false,
    },
  };

  let editor = Monaco.editor.create(element, monacoOptions);
  let suppressNextChangeEvent: boolean;
  let activeCategory: Events = Events.FileSelected;
  let computeSettings: string | undefined = undefined;
  let applicationSettings: string | undefined = undefined;

  // When a file is selected in the workspace, update editor content and language
  workspace.on(Events.FileSelected, function(_) {
    suppressNextChangeEvent = true;
    activeCategory = Events.FileSelected;
    editor.setValue(workspace.getSelectedFileContent() || '');
    let model = editor.getModel();
    let language = workspace.getSelectedFileLanguage();
    if (model && language) {
      Monaco.editor.setModelLanguage(model, language);
    } else {
      Assert.fail('Model or language cannot be determined for the selected file.');
    }
    $(element).show();
  });

  // When the edited file is deleted, hide the editor
  workspace.on(Events.FileDeleted, function(e: FileDeletedEvent) {
    if (workspace.selectedFileName === e.fileName) {
      $(element).hide();
    }
  });

  // When runner is selected in the workspace, update editor content and language
  workspace.on(Events.RunnerSelected, function(_) {
    suppressNextChangeEvent = true;
    activeCategory = Events.RunnerSelected;
    editor.setValue(workspace.getRunnerContent());
    let model = editor.getModel();
    if (model) {
      Monaco.editor.setModelLanguage(model, 'javascript');
    } else {
      Assert.fail('Model cannot be determined the runner script.');
    }
    $(element).show();
  });

  // When compute settings are selected, serialize them and display as INI for editing
  workspace.on(Events.SettingsComputeSelected, function(_) {
    suppressNextChangeEvent = true;
    activeCategory = Events.SettingsComputeSelected;
    computeSettings =
      computeSettings || serializeKeyValue(workspace.functionSpecification.lambda || {}, SettingsComputePlaceholder);
    editor.setValue(computeSettings);
    let model = editor.getModel();
    if (model) {
      Monaco.editor.setModelLanguage(model, 'ini');
    } else {
      Assert.fail('Model cannot be determined for compute node.');
    }
    $(element).show();
  });

  // When application settings are selected, serialize them and display as INI for editing
  workspace.on(Events.SettingsApplicationSelected, function(_) {
    suppressNextChangeEvent = true;
    activeCategory = Events.SettingsApplicationSelected;
    applicationSettings =
      applicationSettings ||
      serializeKeyValue(workspace.functionSpecification.configuration || {}, SettingsApplicationPlaceholder);
    editor.setValue(applicationSettings);
    let model = editor.getModel();
    if (model) {
      Monaco.editor.setModelLanguage(model, 'ini');
    } else {
      Assert.fail('Model cannot be determined for app settings node.');
    }
    $(element).show();
  });

  editor.onDidChangeModelContent(function(_: any) {
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
  var param = /^\s*([^=]+?)\s*=\s*(.*?)\s*$/;
  var value: { [property: string]: string | number } = {};
  var lines = data.split(/[\r\n]+/);
  lines.forEach(function(line) {
    if (/^\s*\#/.test(line)) return;
    var match = line.match(param);
    if (match) {
      value[match[1]] = isNaN(+match[2]) ? match[2] : +match[2];
    }
  });
  return value;
}

function serializeKeyValue(data: { [property: string]: string | number }, placeholder: string) {
  let lines: string[] = [];
  Object.keys(data)
    .sort()
    .forEach(function(key) {
      lines.push(`${key}=${data[key]}`);
    });
  if (lines.length === 0) {
    return placeholder;
  }
  return lines.join('\n');
}
