import { IEvent } from '@5qtrs/event';
import { ServerResponse } from 'http';
import { IBuildStatus } from './Server';

/**
 * Names of the events generated by the [[EditorContext]] class.
 */
export enum Events {
  /**
   * A source file was selected. Event data has [[FileSelectedEvent]] type.
   */
  FileSelected = 'file:selected',
  /**
   * New source file was added. Event data has [[FileAddedEvent]] type.
   */
  FileAdded = 'file:added',
  /**
   * A source file was deleted. Event data has [[FileDeletedEvent]] type.
   */
  FileDeleted = 'file:deleted',
  /**
   * Dirty state of the _EditorContext_ has changed. Event data has [[DirtyStateChangedEvent]] type.
   */
  DirtyStateChanged = 'dirty-state:changed',
  /**
   * Read-only state of the _EditorContext_ has changed. Event data has [[ReadOnlyStateChangedEvent]] type.
   */
  ReadOnlyStateChanged = 'read-only-state:changed',
  /**
   * Not part of MVP
   * @ignore
   */
  SettingsComputeSelected = 'settings:compute:selected',
  /**
   * Application settings were selected. Event data has [[SettingsApplicationSelectedEvent]] type.
   */
  SettingsApplicationSelected = 'settings:application:selected',
  /**
   * Schedule settings were selected. Event data has [[SettingsCronSelectedEvent]] type.
   */
  SettingsCronSelected = 'settings:cron:selected',
  /**
   * Function build has started. Event data has [[BuildStartedEvent]] type.
   */
  BuildStarted = 'build:started',
  /**
   * Build is in progress. Event data has [[BuildProgressEvent]] type.
   */
  BuildProgress = 'build:progressed',
  /**
   * Function build has finished. Event data has [[BuildFinishedEvent]] type.
   */
  BuildFinished = 'build:finished',
  /**
   * Function build finished with error. Event data has [[BuildErrorEvent]] type.
   */
  BuildError = 'build:error',
  /**
   * Runner was selected. Event data has [[RunnerSelectedEvent]] type.
   */
  RunnerSelected = 'runner:selected',
  /**
   * Runner started execution of the function. Event data has [[RunnerStartedEvent]] type.
   */
  RunnerStarted = 'runner:started',
  /**
   * Runner finished execution of the function. Event data has [[RunnerFinishedEvent]] type.
   */
  RunnerFinished = 'runner:finished',
  /**
   * Visibility of logs panel has changed. Event data has [[LogsStateChangedEvent]] type.
   */
  LogsStateChanged = 'logs-state:changed',
  /**
   * Visibility of navigation panel has changed. Event data has [[NavStateChangedEvent]] type.
   */
  NavStateChanged = 'nav-state:changed',
  /**
   * Full screen mode was toggled. Event data has [[FullScreenChangedEvent]] type.
   */
  FullScreenChanged = 'full-screen:changed',
  /**
   * Real-time logs are attached. Event data has [[LogsAttachedEvent]] type.
   */
  LogsAttached = 'logs:attached',
  /**
   * Real-time logs are detached. Event data has [[LogsDetachedEvent]] type.
   */
  LogsDetached = 'logs:detached',
  /**
   * New log entry has arrived. Event data has [[LogsEntryEvent]] type.
   */
  LogsEntry = 'logs:entry',
  /**
   * Editor's "close" button was clicked. Event data has [[ClosedEvent]] type.
   */
  Closed = 'closed',
}

/**
 * Base interface implemented by all events generated by the [[EditorContext]] class.
 */
export interface IEditorEvent extends IEvent {
  /**
   * Name of the event. For possible values see [[Events]] enumeration.
   */
  name: string;
  /**
   * Not part of MVP
   * @ignore
   */
  status?: IBuildStatus;
}

/**
 * Real-time logs are attached.
 */
export class LogsAttachedEvent implements IEditorEvent {
  public name: string = Events.LogsAttached;
  constructor() {
    // do nothing
  }
}

/**
 * Real-time logs are detached.
 */
export class LogsDetachedEvent implements IEditorEvent {
  public name: string = Events.LogsDetached;
  /**
   *
   * @param error If logs were detached due to error, this is the error.
   */
  constructor(public error?: Error) {
    // do nothing
  }
}

/**
 * New log entry is emitted.
 */
export class LogsEntryEvent implements IEditorEvent {
  public name: string = Events.LogsEntry;
  /**
   *
   * @param data The log entry data.
   */
  constructor(public data: string) {
    // do nothing
  }
}

/**
 * Editor's "close" button was clicked.
 */
export class ClosedEvent implements IEditorEvent {
  public name: string = Events.Closed;
  constructor() {
    // do nothing
  }
}

/**
 * A source file was selected.
 */
export class FileSelectedEvent implements IEditorEvent {
  public name: string = Events.FileSelected;
  /**
   *
   * @param fileName The file name of the selected file.
   */
  constructor(public fileName: string) {
    // do nothing
  }
}

/**
 * New source file was added.
 */
export class FileAddedEvent implements IEditorEvent {
  public name: string = Events.FileAdded;
  /**
   *
   * @param fileName The file name of the added file.
   */
  constructor(public fileName: string) {
    // do nothing
  }
}

/**
 * A source file was deleted.
 */
export class FileDeletedEvent implements IEditorEvent {
  public name: string = Events.FileDeleted;
  /**
   *
   * @param fileName The file name of the deleted file.
   */
  constructor(public fileName: string) {
    // do nothing
  }
}

/**
 * Runner was selected.
 */
export class RunnerSelectedEvent implements IEditorEvent {
  public name: string = Events.RunnerSelected;
  constructor() {
    // do nothing
  }
}

/**
 * Dirty state of the [[EditorContext]] has changed.
 */
export class DirtyStateChangedEvent implements IEditorEvent {
  public name: string = Events.DirtyStateChanged;
  /**
   *
   * @param newState The new value of the dirty state.
   */
  constructor(public newState: boolean) {
    // do nothing
  }
}

/**
 * Full screen mode was toggled.
 */
export class FullScreenChangedEvent implements IEditorEvent {
  public name: string = Events.FullScreenChanged;
  constructor(public newState: boolean) {
    // do nothing
  }
}

/**
 * Visibility of the logs panel has changed.
 */
export class LogsStateChangedEvent implements IEditorEvent {
  public name: string = Events.LogsStateChanged;
  /**
   *
   * @param newState The new visibility of the logs panel.
   */
  constructor(public newState: boolean) {
    // do nothing
  }
}

/**
 * Visibility of the navigation panel has changed.
 */
export class NavStateChangedEvent implements IEditorEvent {
  public name: string = Events.NavStateChanged;
  /**
   *
   * @param newState The new visibility of the navigation panel.
   */
  constructor(public newState: boolean) {
    // do nothing
  }
}

/**
 * The read only state of the editor context has changed.
 */
export class ReadOnlyStateChangedEvent implements IEditorEvent {
  public name: string = Events.ReadOnlyStateChanged;
  /**
   *
   * @param newState The new value of the read only state.
   */
  constructor(public newState: boolean) {
    // do nothing
  }
}

/**
 * Not part of MVP
 * @ignore
 */
export class SettingsComputeSelectedEvent implements IEditorEvent {
  public name: string = Events.SettingsComputeSelected;
  constructor() {
    // do nothing
  }
}

/**
 * The application settings were selected.
 */
export class SettingsApplicationSelectedEvent implements IEditorEvent {
  public name: string = Events.SettingsApplicationSelected;
  constructor() {
    // do nothing
  }
}

/**
 * The Scheduler settings were selected.
 */
export class SettingsCronSelectedEvent implements IEditorEvent {
  public name: string = Events.SettingsCronSelected;
  constructor() {
    // do nothing
  }
}

/**
 * New build of a function has started.
 */
export class BuildStartedEvent implements IEditorEvent {
  public name: string = Events.BuildStarted;
  constructor() {
    // do nothing
  }
}

export interface IError {
  message: string;
  status?: number;
  statusCode?: number;
  properties?: any;
}

/**
 * Function build finished with an error.
 */
export class BuildErrorEvent implements IEditorEvent {
  public name: string = Events.BuildError;
  /**
   *
   * @param error The build error.
   */
  constructor(public error: IError) {
    // do nothing
  }
}

/**
 * Build progress report.
 */
export class BuildProgressEvent implements IEditorEvent {
  public name: string = Events.BuildProgress;
  /**
   *
   * @param status Current status and progress of the function build.
   */
  constructor(public status: IBuildStatus) {
    // do nothing
  }
}

/**
 * Build of the function has finished. Note that the status must be inspected to determine success or failure.
 */
export class BuildFinishedEvent implements IEditorEvent {
  public name: string = Events.BuildFinished;
  /**
   *
   * @param status Status of the finished build.
   */
  constructor(public status: IBuildStatus) {
    // do nothing
  }
}

/**
 * Runner started execution of the function.
 */
export class RunnerStartedEvent implements IEditorEvent {
  public name: string = Events.RunnerStarted;
  /**
   *
   * @param url The execution URL of the function.
   */
  constructor(public url: string) {
    // do nothing
  }
}

/**
 * Runner finished execution of the function.
 */
export class RunnerFinishedEvent implements IEditorEvent {
  public name: string = Events.RunnerFinished;
  /**
   *
   * @param error If execution finished with error, this is the error.
   * @param response If execution was successful, this is the response object.
   */
  constructor(public error?: Error, public response?: ServerResponse) {
    // do nothing
  }
}
