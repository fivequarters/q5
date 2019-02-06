import { BuildStatus } from './Server';
import { ServerResponse } from 'http';

export enum Events {
    FileSelected = 'file:selected',
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
    Closed = 'closed',
}

export interface Event {
    name: string;
    status?: BuildStatus;
}

export class ClosedEvent implements Event {
    name: string = Events.Closed;
    constructor() {}
}

export class FileSelectedEvent implements Event {
    name: string = Events.FileSelected;
    constructor(public fileName: string) {}
}

export class RunnerSelectedEvent implements Event {
    name: string = Events.RunnerSelected;
    constructor() {}
}

export class DirtyStateChangedEvent implements Event {
    name: string = Events.DirtyStateChanged;
    constructor(public newState: boolean) {}
}

export class FullScreenChangedEvent implements Event {
    name: string = Events.FullScreenChanged;
    constructor(public newState: boolean) {}
}

export class LogsStateChangedEvent implements Event {
    name: string = Events.LogsStateChanged;
    constructor(public newState: boolean) {}
}

export class NavStateChangedEvent implements Event {
    name: string = Events.NavStateChanged;
    constructor(public newState: boolean) {}
}

export class ReadOnlyStateChangedEvent implements Event {
    name: string = Events.ReadOnlyStateChanged;
    constructor(public newState: boolean) {}
}

export class SettingsComputeSelectedEvent implements Event {
    name: string = Events.SettingsComputeSelected;
    constructor() {}
}

export class SettingsApplicationSelectedEvent implements Event {
    name: string = Events.SettingsApplicationSelected;
    constructor() {}
}

export class BuildStartedEvent implements Event {
    name: string = Events.BuildStarted;
    constructor() {}
}

export class BuildErrorEvent implements Event {
    name: string = Events.BuildError;
    constructor(public error: Error) {}
}

export class BuildProgressEvent implements Event {
    name: string = Events.BuildProgress;
    constructor(public status: BuildStatus) {}
}

export class BuildFinishedEvent implements Event {
    name: string = Events.BuildFinished;
    constructor(public status: BuildStatus) {}
}

export class RunnerStartedEvent implements Event {
    name: string = Events.RunnerStarted;
    constructor(public url: string) {}
}

export class RunnerFinishedEvent implements Event {
    name: string = Events.RunnerFinished;
    constructor(public error?: Error, public response?: ServerResponse) {}
}
