import { IEvent } from '@5qtrs/event';
import { BuildStatus } from './Server';
import { ServerResponse } from 'http';

export enum Events {
  FileSelected = 'file:selected',
  FileAdded = 'file:added',
  FileDeleted = 'file:deleted',
  DirtyStateChanged = 'dirty-state:changed',
  ReadOnlyStateChanged = 'read-only-state:changed',
  SettingsComputeSelected = 'settings:compute:selected',
  SettingsApplicationSelected = 'settings:application:selected',
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

export interface EditorEvent extends IEvent {
  name: string;
  status?: BuildStatus;
}

export class LogsAttached implements EditorEvent {
  name: string = Events.LogsAttached;
  constructor() {}
}

export class LogsDetached implements EditorEvent {
  name: string = Events.LogsDetached;
  constructor(public error?: Error) {}
}

export class LogsEntry implements EditorEvent {
  name: string = Events.LogsEntry;
  constructor(public data: string) {}
}

export class ClosedEvent implements EditorEvent {
  name: string = Events.Closed;
  constructor() {}
}

export class FileSelectedEvent implements EditorEvent {
  name: string = Events.FileSelected;
  constructor(public fileName: string) {}
}

export class FileAddedEvent implements EditorEvent {
  name: string = Events.FileAdded;
  constructor(public fileName: string) {}
}

export class FileDeletedEvent implements EditorEvent {
  name: string = Events.FileDeleted;
  constructor(public fileName: string) {}
}

export class RunnerSelectedEvent implements EditorEvent {
  name: string = Events.RunnerSelected;
  constructor() {}
}

export class DirtyStateChangedEvent implements EditorEvent {
  name: string = Events.DirtyStateChanged;
  constructor(public newState: boolean) {}
}

export class FullScreenChangedEvent implements EditorEvent {
  name: string = Events.FullScreenChanged;
  constructor(public newState: boolean) {}
}

export class LogsStateChangedEvent implements EditorEvent {
  name: string = Events.LogsStateChanged;
  constructor(public newState: boolean) {}
}

export class NavStateChangedEvent implements EditorEvent {
  name: string = Events.NavStateChanged;
  constructor(public newState: boolean) {}
}

export class ReadOnlyStateChangedEvent implements EditorEvent {
  name: string = Events.ReadOnlyStateChanged;
  constructor(public newState: boolean) {}
}

export class SettingsComputeSelectedEvent implements EditorEvent {
  name: string = Events.SettingsComputeSelected;
  constructor() {}
}

export class SettingsApplicationSelectedEvent implements EditorEvent {
  name: string = Events.SettingsApplicationSelected;
  constructor() {}
}

export class BuildStartedEvent implements EditorEvent {
  name: string = Events.BuildStarted;
  constructor() {}
}

export class BuildErrorEvent implements EditorEvent {
  name: string = Events.BuildError;
  constructor(public error: Error) {}
}

export class BuildProgressEvent implements EditorEvent {
  name: string = Events.BuildProgress;
  constructor(public status: BuildStatus) {}
}

export class BuildFinishedEvent implements EditorEvent {
  name: string = Events.BuildFinished;
  constructor(public status: BuildStatus) {}
}

export class RunnerStartedEvent implements EditorEvent {
  name: string = Events.RunnerStarted;
  constructor(public url: string) {}
}

export class RunnerFinishedEvent implements EditorEvent {
  name: string = Events.RunnerFinished;
  constructor(public error?: Error, public response?: ServerResponse) {}
}
