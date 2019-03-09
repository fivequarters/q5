import * as Assert from 'assert';
import * as Monaco from 'monaco-editor/esm/vs/editor/editor.api.js';
import { Events, FileDeletedEvent } from './Events';
import { IEditorPanelOptions } from './Options';
import { Workspace } from './Workspace';

/**
 * Not part of MVP
 * @ignore
 * @param element
 * @param workspace
 * @param options
 */
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
    editor.setValue(workspace.getComputeSettings());
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
    editor.setValue(workspace.getApplicationSettings());
    const model = editor.getModel();
    if (model) {
      Monaco.editor.setModelLanguage(model, 'ini');
    } else {
      Assert.fail('Model cannot be determined for app settings node.');
    }
    $(element).show();
  });

  // When cron settings are selected, serialize them and display as INI for editing
  workspace.on(Events.SettingsCronSelected, () => {
    suppressNextChangeEvent = true;
    activeCategory = Events.SettingsCronSelected;
    editor.setValue(workspace.getCronSettings());
    const model = editor.getModel();
    if (model) {
      Monaco.editor.setModelLanguage(model, 'ini');
    } else {
      Assert.fail('Model cannot be determined for CRON settings node.');
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
          workspace.setSettingsCompute(editor.getValue());
          break;
        case Events.SettingsApplicationSelected:
          workspace.setSettingsApplication(editor.getValue());
          break;
        case Events.SettingsCronSelected:
          workspace.setSettingsCron(editor.getValue());
          break;
      }
    } else {
      suppressNextChangeEvent = false;
    }
  });

  return workspace;
}
