export interface IEditorOptions {
  actionPanel?: IActionPanelOptions | boolean;
  editorPanel?: IEditorPanelOptions | boolean;
  logsPanel?: ILogsPanelOptions | boolean;
  navigationPanel?: INavigationPanelOptions | boolean;
  statusPanel?: IStatusPanelOptions | boolean;
  [property: string]: any;
}

export class EditorOptions implements IEditorOptions {
  public actionPanel = new ActionPanelOptions();
  public editorPanel = new EditorPanelOptions();
  public logsPanel = new LogsPanelOptions();
  public navigationPanel = new NavigationPanelOptions();
  public statusPanel = new StatusPanelOptions();
  [property: string]: any;
}

export interface IActionPanelOptions {
  enableCodeOnlyToggle?: boolean;
  enableFullScreen?: boolean;
  enableClose?: boolean;
  [property: string]: any;
}

export class ActionPanelOptions implements IActionPanelOptions {
  public enableCodeOnlyToggle: boolean = true;
  public enableFullScreen: boolean = true;
  public enableClose: boolean = true;
  constructor() {
    // do nothing
  }
}

export interface IEditorPanelOptions {
  [property: string]: any;
}

export class EditorPanelOptions implements IEditorPanelOptions {}

export interface ILogsPanelOptions {
  maxSize?: number;
  [property: string]: any;
}

export class LogsPanelOptions implements ILogsPanelOptions {
  public maxSize: number = 10 * 1024;
  constructor() {
    // do nothing
  }
}

export interface INavigationPanelOptions {
  hideCode?: boolean;
  hideFiles?: string[];
  hideComputeSettings?: boolean;
  hideApplicationSettings?: boolean;
  hideRunnerTool?: boolean;
  [property: string]: any;
}

export class NavigationPanelOptions implements INavigationPanelOptions {
  public hideCode = false;
  public hideFiles = [];
  public hideComputeSettings = true; // hide Compute settings by default
  public hideApplicationSettings = false;
  public hideRunnerTool = false;
  constructor() {
    // do nothing
  }
}

export interface IStatusPanelOptions {
  [property: string]: any;
}

export class StatusPanelOptions implements IStatusPanelOptions {}
