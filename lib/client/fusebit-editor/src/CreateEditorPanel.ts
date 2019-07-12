import * as Assert from 'assert';
import * as Monaco from 'monaco-editor/esm/vs/editor/editor.api.js';
import { Events, FileDeletedEvent, FileSelectedEvent } from './Events';
import { IEditorPanelOptions } from './Options';
import { EditorContext } from './EditorContext';
import { updateFusebitContextTypings, addStaticTypings, updateNodejsTypings, updateDependencyTypings } from './Typings';

/**
 * Not part of MVP
 * @ignore
 * @param element
 * @param editorContext
 * @param options
 */
export function createEditorPanel(element: HTMLElement, editorContext: EditorContext, options?: IEditorPanelOptions) {
  let theme = (options && options.theme) || 'light';
  let monacoTheme: any;
  switch (theme) {
    case 'dark':
      monacoTheme = {
        base: 'vs-dark',
        inherit: true, // can also be false to completely replace the builtin rules
        rules: [],
      };
      break;
    default:
      monacoTheme = {
        base: 'vs', // can also be vs-dark or hc-black
        inherit: true, // can also be false to completely replace the builtin rules
        rules: [],
        colors: {
          // 'editor.background': '#212F3C',
          'scrollbar.shadow': '#ffffff',
          'editor.lineHighlightBackground': '#f7f9f9',
        },
      };
      break;
  }
  Monaco.editor.defineTheme('customTheme', monacoTheme);

  const monacoOptions = {
    ...options,
    theme: 'customTheme',
    model: Monaco.editor.createModel(
      editorContext.getSelectedFileContent() || '',
      editorContext.getSelectedFileLanguage(),
      Monaco.Uri.parse('file:///index.js')
    ),
    automaticLayout: true,
    minimap: {
      enabled: false,
    },
  };

  const editor = Monaco.editor.create(element, monacoOptions);
  let suppressNextChangeEvent: boolean;
  let editedFileName: string | undefined;
  let activeCategory: Events = Events.FileSelected;
  let viewStates: { [property: string]: Monaco.editor.ICodeEditorViewState } = {};

  // When a file is selected in the editor context, update editor content and language
  editorContext.on(Events.FileSelected, (e: FileSelectedEvent) => {
    captureViewState();
    suppressNextChangeEvent = true;
    activeCategory = Events.FileSelected;
    editedFileName = e.fileName;
    editor.setValue(editorContext.getSelectedFileContent() || '');
    const model = editor.getModel();
    const language = editorContext.getSelectedFileLanguage();
    let packageJson: any = editorContext.getPackageJson();
    updateNodejsTypings(editorContext.getNodeVersion(packageJson));
    updateDependencyTypings(editorContext.getDependencies(packageJson));
    if (model && language) {
      Monaco.editor.setModelLanguage(model, language);
    } else {
      Assert.fail('Model or language cannot be determined for the selected file.');
    }
    restoreViewState(activeCategory, editedFileName);
    element.style.display = null;
  });

  // When the edited file is deleted, hide the editor
  editorContext.on(Events.FileDeleted, (e: FileDeletedEvent) => {
    delete viewStates[`${Events.FileSelected}:${e.fileName}`];
    if (editorContext.selectedFileName === e.fileName) {
      element.style.display = 'none';
    }
  });

  // When runner is selected in the editor context, update editor content and language
  editorContext.on(Events.RunnerSelected, () => {
    captureViewState();
    suppressNextChangeEvent = true;
    activeCategory = Events.RunnerSelected;
    editor.setValue(editorContext.getRunnerContent());
    const model = editor.getModel();
    if (model) {
      Monaco.editor.setModelLanguage(model, 'javascript');
    } else {
      Assert.fail('Model cannot be determined the runner script.');
    }
    restoreViewState(activeCategory);
    element.style.display = null;
  });

  // When compute settings are selected, serialize them and display as INI for editing
  editorContext.on(Events.SettingsComputeSelected, _ => {
    captureViewState();
    suppressNextChangeEvent = true;
    activeCategory = Events.SettingsComputeSelected;
    editor.setValue(editorContext.getComputeSettings());
    const model = editor.getModel();
    if (model) {
      Monaco.editor.setModelLanguage(model, 'ini');
    } else {
      Assert.fail('Model cannot be determined for compute node.');
    }
    restoreViewState(activeCategory);
    element.style.display = null;
  });

  // When application settings are selected, serialize them and display as INI for editing
  editorContext.on(Events.SettingsApplicationSelected, () => {
    captureViewState();
    suppressNextChangeEvent = true;
    activeCategory = Events.SettingsApplicationSelected;
    editor.setValue(editorContext.getApplicationSettings());
    const model = editor.getModel();
    if (model) {
      Monaco.editor.setModelLanguage(model, 'ini');
    } else {
      Assert.fail('Model cannot be determined for app settings node.');
    }
    restoreViewState(activeCategory);
    element.style.display = null;
  });

  // When cron settings are selected, serialize them and display as INI for editing
  editorContext.on(Events.SettingsCronSelected, () => {
    captureViewState();
    suppressNextChangeEvent = true;
    activeCategory = Events.SettingsCronSelected;
    editor.setValue(editorContext.getCronSettings());
    const model = editor.getModel();
    if (model) {
      Monaco.editor.setModelLanguage(model, 'ini');
    } else {
      Assert.fail('Model cannot be determined for CRON settings node.');
    }
    restoreViewState(activeCategory);
    element.style.display = null;
  });

  editor.onDidChangeModelContent(() => {
    if (!suppressNextChangeEvent) {
      switch (activeCategory) {
        case Events.FileSelected:
          editorContext.setSelectedFileContent(editor.getValue());
          break;
        case Events.RunnerSelected:
          editorContext.setRunnerContent(editor.getValue());
          break;
        case Events.SettingsComputeSelected:
          editorContext.setSettingsCompute(editor.getValue());
          break;
        case Events.SettingsApplicationSelected:
          editorContext.setSettingsApplication(editor.getValue());
          updateFusebitContextTypings(editorContext.functionSpecification.configuration || {});
          break;
        case Events.SettingsCronSelected:
          editorContext.setSettingsCron(editor.getValue());
          break;
      }
    } else {
      suppressNextChangeEvent = false;
    }
  });

  addStaticTypings();
  updateFusebitContextTypings(editorContext.functionSpecification.configuration || {});
  let packageJson: any = editorContext.getPackageJson();
  updateNodejsTypings(editorContext.getNodeVersion(packageJson));
  updateDependencyTypings(editorContext.getDependencies(packageJson));

  return editorContext;

  function captureViewState() {
    if (activeCategory === Events.FileSelected && !editedFileName) return;
    let key = activeCategory === Events.FileSelected ? `${activeCategory}:${editedFileName}` : activeCategory;
    viewStates[key] = editor.saveViewState() as Monaco.editor.ICodeEditorViewState;
  }

  function restoreViewState(event: string, fileName?: string) {
    let key = event === Events.FileSelected ? `${event}:${fileName}` : event;
    if (viewStates[key]) {
      editor.restoreViewState(viewStates[key]);
    } else {
      editor.revealLine(1, Monaco.editor.ScrollType.Immediate);
      editor.setPosition({ lineNumber: 1, column: 1 });
    }
  }
}
