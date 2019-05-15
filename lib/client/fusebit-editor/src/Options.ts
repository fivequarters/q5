/**
 * Editor options that control its presentation and behavior. Default values are represented by the [[EditorOptions]] class.
 *
 * This is the synopsis of the defaults:
 *
 * ```javascript
 * {
 *    theme: 'light',
 *    actionPanel: {
 *      enableCodeOnlyToggle: true,
 *      enableFullScreen: true,
 *    },
 *    editorPanel: {},
 *    logsPanel: {
 *      maxSize: 10 * 1024,
 *    },
 *    navigationPanel: {
 *      hideCode: false,
 *      hideFiles: [],
 *      hideApplicationSettings: false,
 *      hideCronSettings: false,
 *      hideRunnerTool: false,
 *    },
 *    statusPanel: {},
 * }
 * ```
 */
export interface IEditorOptions {
  /**
   * Ensures that the function exists when the editor opens. When set to true, either an existing function
   * is loaded, or a new function is created from the provided template before the editor opens. When set
   * to false (default) and the function does not yet exist, the editor opens showing the provided template,
   * but the user must explicitly save the function for it to be created.
   */
  ensureFunctionExists?: boolean;
  /**
   * Editor style theme.
   */
  theme?: EditorTheme;
  /**
   * Options of the action panel of the editor. If set to `false`, hides the action panel.
   */
  actionPanel?: IActionPanelOptions | boolean;
  /**
   * Options of the panel containing the actual code editor. If set to `false`, hides the editor panel.
   */
  editorPanel?: IEditorPanelOptions | boolean;
  /**
   * Options of the logs panel. If set to `false`, hides the logs panel.
   */
  logsPanel?: ILogsPanelOptions | boolean;
  /**
   * Options of the navigation panel. If set to `false`, hides the navigation panel.
   */
  navigationPanel?: INavigationPanelOptions | boolean;
  /**
   * Options of the status panel. If set to `false`, hides the status panel.
   */
  statusPanel?: IStatusPanelOptions | boolean;
  [property: string]: any;
}

/**
 * Choice of the editor style: light or dark.
 */
enum EditorTheme {
  Light = 'light',
  Dark = 'dark',
}

/**
 * Default values for the [[IEditorPanel]].
 */
export class EditorOptions implements IEditorOptions {
  public ensureFunctionExists = false;
  public theme = EditorTheme.Light;
  public actionPanel = new ActionPanelOptions();
  public editorPanel = new EditorPanelOptions();
  public logsPanel = new LogsPanelOptions();
  public navigationPanel = new NavigationPanelOptions();
  public statusPanel = new StatusPanelOptions();
  [property: string]: any;
}

/**
 * Options of the action panel of the editor. Default values are represented by the [[ActionPanelOptions]] class.
 */
export interface IActionPanelOptions {
  /**
   * Editor style theme.
   */
  theme?: EditorTheme;
  /**
   * Enables or disables the button that allows the editor to enter the "Zen" mode showing just the code editor.
   */
  enableCodeOnlyToggle?: boolean;
  /**
   * Enables or disables the button that allows the editor to switch to and from the full screen mode.
   */
  enableFullScreen?: boolean;
  /**
   * Enables or disables the "close" button of the editor. The "close" button facilitates the use of the editor in a context of a modal view.
   * @ignore
   */
  enableClose?: boolean;
  [property: string]: any;
}

/**
 * Default values for the [[IActionPanelOptions]].
 */
export class ActionPanelOptions implements IActionPanelOptions {
  public theme = EditorTheme.Light;
  public enableCodeOnlyToggle: boolean = true;
  public enableFullScreen: boolean = true;
  /**
   * @ignore
   */
  public enableClose: boolean = false;
  constructor() {
    // do nothing
  }
}

/**
 * Options of the editor panel that hosts the code editor. At present there are none, but check back soon.
 */
export interface IEditorPanelOptions {
  /**
   * Editor style theme.
   */
  theme?: EditorTheme;
  [property: string]: any;
}

/**
 * Default values for the [[IEditorPanelOptions]].
 */
export class EditorPanelOptions implements IEditorPanelOptions {
  public theme = EditorTheme.Light;
  constructor() {
    // do nothing
  }
}

/**
 * Options of the logs panel. Default values are represented by the [[LogsPanelOptions]] class.
 */
export interface ILogsPanelOptions {
  /**
   * Editor style theme.
   */
  theme?: EditorTheme;
  /**
   * Maximum number of characters that the logs panel shows. If that nunber is exceededm, older logs are discarded.
   */
  maxSize?: number;
  [property: string]: any;
}

/**
 * Default values for the [[ILogsPanelOptions]].
 */
export class LogsPanelOptions implements ILogsPanelOptions {
  public theme = EditorTheme.Light;
  public maxSize: number = 10 * 1024;
  constructor() {
    // do nothing
  }
}

/**
 * Options of the navigation panel. Default values are represented by the [[NavigationPanelOptions]] class.
 */
export interface INavigationPanelOptions {
  /**
   * Editor style theme.
   */
  theme?: EditorTheme;
  /**
   * Hides the node of the navigation that shows the list of files making up the function.
   */
  hideCode?: boolean;
  /**
   * A list of files present in the function specification which should not be shown in the navigation panel.
   */
  hideFiles?: string[];
  /**
   * Not in MVP
   * @ignore
   */
  hideComputeSettings?: boolean;
  /**
   * Hides the Application Settings node.
   */
  hideApplicationSettings?: boolean;
  /**
   * Hides the Scheduler settings node.
   */
  hideCronSettings?: boolean;
  /**
   * Hides the Runner node.
   */
  hideRunnerTool?: boolean;
  [property: string]: any;
}

/**
 * Default values for the [[INavigationPanelOptions]].
 */
export class NavigationPanelOptions implements INavigationPanelOptions {
  public theme = EditorTheme.Light;
  public hideCode = false;
  public hideFiles = [];
  /**
   * Not in MVP
   * @ignore
   */
  public hideComputeSettings = true; // hide Compute settings by default
  public hideApplicationSettings = false;
  public hideCronSettings = false;
  public hideRunnerTool = false;
  constructor() {
    // do nothing
  }
}

/**
 * Options of the status panel. At present there are none, but check back soon.
 */
export interface IStatusPanelOptions {
  /**
   * Editor style theme.
   */
  theme?: EditorTheme;
  [property: string]: any;
}

/**
 * Default values for the [[IStatusPanelOptions]].
 */
export class StatusPanelOptions implements IStatusPanelOptions {
  public theme = EditorTheme.Light;
  constructor() {
    // do nothing
  }
}
