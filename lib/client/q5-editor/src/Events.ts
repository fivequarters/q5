import { IEvent } from '@5qtrs/event';
import { ServerResponse } from 'http';
import { IBuildStatus } from './Server';

export enum Events {
  FileSelected = 'file:selected',
  FileAdded = 'file:added',
  FileDeleted = 'file:deleted',
  DirtyStateChanged = 'dirty-state:changed',
  ReadOnlyStateChanged = 'read-only-state:changed',
  SettingsComputeSelected = 'settings:compute:selected',
  SettingsApplicationSelected = 'settings:application:selected',
  SettingsCronSelected = 'settings:cron:selected',
  BuildStarted = 'build:started',
  BuildProgress = 'build:progressed',
  BuildFinished = 'build:finished',
  BuildError = 'build:error',
  RunnerSelected = 'runner:selected',
  RunnerStarted = 'runner:started',
  RunnerFinished = 'runner:finished',
  LogsStateChanged = 'logs-state:changed',
  NavStateChanged = 'nav-state:changed',
  FullScreenChanged = 'full-screen:changed',
  LogsAttached = 'logs:attached',
  LogsDetached = 'logs:detached',
  LogsEntry = 'logs:entry',
  Closed = 'closed',
}

export interface IEditorEvent extends IEvent {
  name: string;
  status?: IBuildStatus;
}

export class LogsAttached implements IEditorEvent {
  public name: string = Events.LogsAttached;
  constructor() {
    // do nothing
  }
}

export class LogsDetached implements IEditorEvent {
  public name: string = Events.LogsDetached;
  constructor(public error?: Error) {
    // do nothing
  }
}

export class LogsEntry implements IEditorEvent {
  public name: string = Events.LogsEntry;
  constructor(public data: string) {
    // do nothing
  }
}

export class ClosedEvent implements IEditorEvent {
  public name: string = Events.Closed;
  constructor() {
    // do nothing
  }
}

export class FileSelectedEvent implements IEditorEvent {
  public name: string = Events.FileSelected;
  constructor(public fileName: string) {
    // do nothing
  }
}

export class FileAddedEvent implements IEditorEvent {
  public name: string = Events.FileAdded;
  constructor(public fileName: string) {
    // do nothing
  }
}

export class FileDeletedEvent implements IEditorEvent {
  public name: string = Events.FileDeleted;
  constructor(public fileName: string) {
    // do nothing
  }
}

export class RunnerSelectedEvent implements IEditorEvent {
  public name: string = Events.RunnerSelected;
  constructor() {
    // do nothing
  }
}

export class DirtyStateChangedEvent implements IEditorEvent {
  public name: string = Events.DirtyStateChanged;
  constructor(public newState: boolean) {
    // do nothing
  }
}

export class FullScreenChangedEvent implements IEditorEvent {
  public name: string = Events.FullScreenChanged;
  constructor(public newState: boolean) {
    // do nothing
  }
}

export class LogsStateChangedEvent implements IEditorEvent {
  public name: string = Events.LogsStateChanged;
  constructor(public newState: boolean) {
    // do nothing
  }
}

export class NavStateChangedEvent implements IEditorEvent {
  public name: string = Events.NavStateChanged;
  constructor(public newState: boolean) {
    // do nothing
  }
}

export class ReadOnlyStateChangedEvent implements IEditorEvent {
  public name: string = Events.ReadOnlyStateChanged;
  constructor(public newState: boolean) {
    // do nothing
  }
}

export class SettingsComputeSelectedEvent implements IEditorEvent {
  public name: string = Events.SettingsComputeSelected;
  constructor() {
    // do nothing
  }
}

export class SettingsApplicationSelectedEvent implements IEditorEvent {
  public name: string = Events.SettingsApplicationSelected;
  constructor() {
    // do nothing
  }
}

export class SettingsCronSelectedEvent implements IEditorEvent {
  public name: string = Events.SettingsCronSelected;
  constructor() {
    // do nothing
  }
}

export class BuildStartedEvent implements IEditorEvent {
  public name: string = Events.BuildStarted;
  constructor() {
    // do nothing
  }
}

export class BuildErrorEvent implements IEditorEvent {
  public name: string = Events.BuildError;
  constructor(public error: Error) {
    // do nothing
  }
}

export class BuildProgressEvent implements IEditorEvent {
  public name: string = Events.BuildProgress;
  constructor(public status: IBuildStatus) {
    // do nothing
  }
}

export class BuildFinishedEvent implements IEditorEvent {
  public name: string = Events.BuildFinished;
  constructor(public status: IBuildStatus) {
    // do nothing
  }
}

export class RunnerStartedEvent implements IEditorEvent {
  public name: string = Events.RunnerStarted;
  constructor(public url: string) {
    // do nothing
  }
}

export class RunnerFinishedEvent implements IEditorEvent {
  public name: string = Events.RunnerFinished;
  constructor(public error?: Error, public response?: ServerResponse) {
    // do nothing
  }
}
