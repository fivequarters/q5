import * as Assert from 'assert';
import * as Monaco from 'monaco-editor/esm/vs/editor/editor.api.js';
import { Events, FileDeletedEvent, FileSelectedEvent } from './Events';
import { IEditorPanelOptions } from './Options';
import { EditorContext } from './EditorContext';
import { updateFusebitContextTypings, addStaticTypings, updateNodejsTypings, updateDependencyTypings } from './Typings';

/**
 * Creates an editor panel within the specified HTML element and associacted with the existing [[EditorContext]].
 *
 * @param element The HTML element (typically a div) within which to create the editor panel.
 * @param editorContext A pre-existing editor context to associate the editor panel with.
 * @param options Editor panel creation options.
 */
export function createEditorPanel(element: HTMLElement, editorContext: EditorContext, options?: IEditorPanelOptions) {
  const theme = options?.theme || 'light';
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

  const editor = (editorContext._monaco = Monaco.editor.create(element, monacoOptions));
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
    const metadata = editorContext.getMetadata();
    const components = editorContext.getComponents();
    updateNodejsTypings(editorContext.getNodeVersion(packageJson));
    updateDependencyTypings(editorContext.getDependencies(packageJson), metadata.editor.registry, components);
    if (model && language) {
      Monaco.editor.setModelLanguage(model, language);
    } else {
      Assert.fail('Model or language cannot be determined for the selected file.');
    }
    restoreViewState(activeCategory, editedFileName);
    element.style.display = 'unset';
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
    element.style.display = 'unset';
  });

  // When compute settings are selected, serialize them and display as INI for editing
  editorContext.on(Events.SettingsComputeSelected, (_) => {
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
    element.style.display = 'unset';
  });

  // When configuration settings are selected, serialize them and display as INI for editing
  editorContext.on(Events.SettingsConfigurationSelected, () => {
    captureViewState();
    suppressNextChangeEvent = true;
    activeCategory = Events.SettingsConfigurationSelected;
    editor.setValue(editorContext.getConfigurationSettings());
    const model = editor.getModel();
    if (model) {
      Monaco.editor.setModelLanguage(model, 'ini');
    } else {
      Assert.fail('Model cannot be determined for Configuration settings node.');
    }
    restoreViewState(activeCategory);
    element.style.display = 'unset';
  });

  // When schedule settings are selected, serialize them and display as INI for editing
  editorContext.on(Events.SettingsScheduleSelected, () => {
    captureViewState();
    suppressNextChangeEvent = true;
    activeCategory = Events.SettingsScheduleSelected;
    editor.setValue(editorContext.getScheduleSettings());
    const model = editor.getModel();
    if (model) {
      Monaco.editor.setModelLanguage(model, 'ini');
    } else {
      Assert.fail('Model cannot be determined for Schedule settings node.');
    }
    restoreViewState(activeCategory);
    element.style.display = 'unset';
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
        case Events.SettingsConfigurationSelected:
          editorContext.setSettingsConfiguration(editor.getValue());
          updateFusebitContextTypings(editorContext.getConfiguration());
          break;
        case Events.SettingsScheduleSelected:
          editorContext.setSettingsSchedule(editor.getValue());
          break;
      }
    } else {
      suppressNextChangeEvent = false;
    }
  });

  addStaticTypings();
  updateFusebitContextTypings(editorContext.getConfiguration());
  let packageJson: any = editorContext.getPackageJson();
  updateNodejsTypings(editorContext.getNodeVersion(packageJson));
  const metadata = editorContext.getMetadata();
  const components = editorContext.getComponents();
  updateDependencyTypings(editorContext.getDependencies(packageJson), metadata.editor.registry, components);

  return editorContext;

  function captureViewState() {
    if (activeCategory === Events.FileSelected && !editedFileName) {
      return;
    }
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
