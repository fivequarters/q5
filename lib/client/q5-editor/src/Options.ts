export interface IEditorOptions {
    actionPanel?: IActionPanelOptions | boolean;
    editorPanel?: IEditorPanelOptions | boolean;
    logsPanel?: ILogsPanelOptions | boolean;
    navigationPanel?: INavigationPanelOptions | boolean; 
    statusPanel?: IStatusPanelOptions | boolean;
    [property:string]: any;
}

export class EditorOptions implements IEditorOptions {
    actionPanel = new ActionPanelOptions();
    editorPanel = new EditorPanelOptions();
    logsPanel = new LogsPanelOptions();
    navigationPanel = new NavigationPanelOptions();
    statusPanel = new StatusPanelOptions();
    [property:string]: any;
}

export interface IActionPanelOptions {
    enableCodeOnlyToggle?: boolean;
    enableFullScreen?: boolean;
    enableClose?: boolean;
    [property:string]: any;
}

export class ActionPanelOptions implements IActionPanelOptions {
    enableCodeOnlyToggle: boolean = true;
    enableFullScreen: boolean = true;
    enableClose: boolean = false;
    constructor() {}
}

export interface IEditorPanelOptions {
    [property:string]: any;
}

export class EditorPanelOptions implements IEditorPanelOptions {
    
}

export interface ILogsPanelOptions {
    maxSize?: number;
    [property:string]: any;
}

export class LogsPanelOptions implements ILogsPanelOptions {
    maxSize: number = 10 * 1024;
    constructor() {}
}

export interface INavigationPanelOptions {
    [property:string]: any;
}

export class NavigationPanelOptions implements INavigationPanelOptions {
    
}


export interface IStatusPanelOptions {
    [property:string]: any;
}

export class StatusPanelOptions implements IStatusPanelOptions {
    
}

