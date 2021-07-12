import { EventEmitter } from '@5qtrs/event';
import { ServerResponse } from 'http';
import * as Events from './Events';
import { IFunctionSpecification } from './FunctionSpecification';
import { IIntegrationSpecification } from './IntegrationSpecification';
import { IBuildStatus, Server } from './Server';

/**
 * The _EditorContext_ class class represents client side state of a single function, including its files,
 * configuration settings, schedule of execution (in case of a CRON job), and metadata.
 * It exposes methods to manipulate this in-memory state, and emits events other components can subscribe to when
 * that state changes.
 *
 * The _EditorContext_ is an _EventEmitter_ that emits events on changes in the function specification and interactions
 * with the Fusebit HTTP APIs. For the full list of of events that can be subscribed to, see [[Events]].
 */
export abstract class BaseEditorContext<ISpecType> extends EventEmitter {
  /**
   * Name of the function, unique within the boundary.
   */
  public functionId: string = '';
  /**
   * Isolation boundary within which this function executes. Functions running in different boundaries are
   * guaranteed to be isolated.  Functions running in the same boundary may or may not be isolated.
   */
  public boundaryId: string = '';
  /**
   * Execution URL of the function.
   */
  public location?: string;
  /**
   * Not relevant for MVP
   * @ignore
   */
  public readOnly: boolean = false;
  /**
   * Not relevant for MVP
   * @ignore
   */
  public selectedFileName: string | undefined = undefined;
  /**
   * Indicates whether the editor has any unsaved changes.
   */
  public dirtyState: boolean = false;

  /**
   * Not relevant for MVP
   * @ignore
   */
  public _monaco: any;

  /**
   * Not relevant for MVP
   * @ignore
   */
  public _server: Server;

  public specification: ISpecType;

  public metadata: any;

  public abstract addFileToSpecification(fileName: string, content: string, overwrite: boolean): void;
  public abstract deleteFileFromSpecification(fileName: string): void;
  public abstract fileExistsInSpecification(fileName: string): boolean;
  public abstract getFiles(): { [fileName: string]: string | object };
  public abstract setRunnerContent(content: string): void;
  public abstract setSettingsCompute(content: string): void;
  public abstract setSettingsConfiguration(settings: string): void;
  public abstract setSettingsSchedule(settings: string): void;
  public abstract getRunnerContent(): string;
  public abstract getComputeSettings(): string;
  public abstract getConfigurationSettings(): string;
  public abstract getConfiguration(): { [index: string]: string | number };
  public abstract getScheduleSettings(): string;
  public abstract getFileFromSpecification(fileName: string): string | object;

  /**
   * Creates a _EditorContext_ given the optional function specification. If you do not provide a function
   * specification, the default is a boilerplate "hello, world" function.
   * @param specification
   * @ignore Not relevant for MVP
   */
  constructor(server: Server, boundaryId: string, id: string, specification: ISpecType) {
    super();

    this.specification = specification;
    this._server = server;
    this.metadata = { editor: {}, fusebit: {} };

    if (boundaryId) {
      this.boundaryId = boundaryId;
    }
    if (id) {
      this.functionId = id;
    }
  }

  public attachServerLogs() {
    this._server.attachServerLogs(this);
  }

  /**
   * Initiaties a new build of the function. This is an asynchronous operation that communicates
   * its progress through events emitted from this _EditorContext_ instance.
   */
  public saveFunction() {
    this._server.saveFunction(this).catch((_) => {});
  }

  /**
   * Initiaties a the invocation of the function. This is an asynchronous operation that communicates
   * its progress through events emitted from this _EditorContext_ instance.
   */
  public runFunction() {
    this._server.runFunction(this).catch((_) => {});
  }

  public setReadOnly(value: boolean) {
    if (value !== this.readOnly) {
      this.readOnly = value;
      const event = new Events.ReadOnlyStateChangedEvent(this.readOnly);
      this.emit(event);
    }
  }

  public _ensureWritable() {
    if (this.readOnly) {
      throw new Error('Operation not permitted while the editor context is in read-only state.');
    }
  }

  /**
   * Navigates to the Configuration Settings view.
   */
  public selectSettingsConfiguration() {
    this.selectedFileName = undefined;
    const event = new Events.SettingsConfigurationSelectedEvent();
    this.emit(event);
  }

  public selectSettingsCompute() {
    this.selectedFileName = undefined;
    const event = new Events.SettingsComputeSelectedEvent();
    this.emit(event);
  }

  /**
   * Navigates to the Schedule view.
   */
  public selectSettingsSchedule() {
    this.selectedFileName = undefined;
    const event = new Events.SettingsScheduleSelectedEvent();
    this.emit(event);
  }

  /**
   * Navigates to the Runner view.
   */
  public selectToolsRunner() {
    this.selectedFileName = undefined;
    const event = new Events.RunnerSelectedEvent();
    this.emit(event);
  }

  public addFile(fileName: string) {
    let content: string = `# ${fileName}`;
    if (fileName.match(/\.js$/)) {
      content = `module.exports = () => {};`;
    } else if (fileName.match(/\.json$/)) {
      content = `{}`;
    }

    this.addFileToSpecification(fileName, content, false);

    const event = new Events.FileAddedEvent(fileName);
    this.emit(event);
    this.setDirtyState(true);
  }

  public deleteFile(fileName: string) {
    if (!this.fileExistsInSpecification(fileName)) {
      throw new Error(`File ${fileName} does not exist.`);
    }
    const event = new Events.FileDeletedEvent(fileName);
    this.emit(event);
    this.setDirtyState(true);
    if (this.selectedFileName === fileName) {
      this.selectedFileName = undefined;
    }

    this.deleteFileFromSpecification(fileName);
  }

  /**
   * Navigates to edit a specific file. The file name must exist in the [[specification]].
   * @param fileName The name of the file to edit.
   */
  public selectFile(fileName: string) {
    if (fileName === this.selectedFileName) {
      return;
    }
    if (!this.fileExistsInSpecification(fileName)) {
      throw new Error(`File ${fileName} does not exist in the function specification.`);
    }
    this.selectedFileName = fileName;
    const event = new Events.FileSelectedEvent(fileName);
    this.emit(event);
  }

  public setSelectedFileContent(content: string) {
    if (!this.selectedFileName) {
      throw new Error('Cannot set selected file content because no file is selected.');
    }

    this.addFileToSpecification(this.selectedFileName, content, true);
    this.setDirtyState(true);
  }

  public setDirtyState(state: boolean) {
    if (this.dirtyState !== state) {
      this.dirtyState = state;
      const event = new Events.DirtyStateChangedEvent(state);
      this.emit(event);
    }
  }

  public getSelectedFileContent() {
    if (!this.selectedFileName) {
      return undefined;
    }
    const content = this.getFileFromSpecification(this.selectedFileName);

    if (typeof content === 'string') {
      return content;
    } else if (content && typeof content === 'object') {
      return JSON.stringify(content, null, 2);
    } else {
      return undefined;
    }
  }

  public getSelectedFileLanguage() {
    if (!this.selectedFileName) {
      return undefined;
    }
    if (this.selectedFileName.match(/\.js$/)) {
      return 'javascript';
    } else if (this.selectedFileName.match(/\.json$/)) {
      return 'json';
    } else {
      return 'text';
    }
  }

  public startBuild() {
    const event = new Events.BuildStartedEvent();
    this.emit(event);
  }

  public buildProgress(status: IBuildStatus) {
    const event = new Events.BuildProgressEvent(status);
    this.emit(event);
  }

  public buildFinished(status: IBuildStatus) {
    if (status.location) {
      this.location = status.location;
    } else {
      this.location = undefined;
    }
    status.progress = 1;
    const event = new Events.BuildFinishedEvent(status);
    this.emit(event);
  }

  public buildError(error: Events.IError) {
    const event = new Events.BuildErrorEvent(error);
    this.emit(event);
  }

  public startRun(url: string) {
    const event = new Events.RunnerStartedEvent(url);
    this.emit(event);
  }

  public finishRun(error?: Error, res?: ServerResponse) {
    const event = new Events.RunnerFinishedEvent(error, res);
    this.emit(event);
  }

  public updateLogsState(state: boolean) {
    const event = new Events.LogsStateChangedEvent(state);
    this.emit(event);
  }

  public updateNavState(state: boolean) {
    const event = new Events.NavStateChangedEvent(state);
    this.emit(event);
  }

  public setFullScreen(state: boolean) {
    const event = new Events.FullScreenChangedEvent(state);
    this.emit(event);
  }

  public close() {
    const event = new Events.ClosedEvent();
    this.emit(event);
  }

  /**
   * Disposes the editor resources when the editor is no longer needed.
   */
  public dispose() {
    if (this._monaco) {
      this._monaco.getModel().dispose();
      this._monaco.dispose();
      this._monaco = undefined;
    }
  }

  public serverLogsAttached() {
    const event = new Events.LogsAttachedEvent();
    this.emit(event);
  }

  public serverLogsDetached(error?: Error) {
    const event = new Events.LogsDetachedEvent(error);
    this.emit(event);
  }

  public serverLogsEntry(data: string) {
    const event = new Events.LogsEntryEvent(data);
    this.emit(event);
  }

  public getPackageJson(): any {
    let packageJson: any = this.getFileFromSpecification('package.json');
    if (packageJson) {
      if (typeof packageJson === 'string') {
        try {
          packageJson = JSON.parse(packageJson);
        } catch (_) {
          packageJson = undefined;
        }
      }
    }
    return packageJson;
  }

  public getNodeVersion(pj: any): string {
    const packageJson: any = pj || this.getPackageJson();
    return (packageJson && packageJson.engines && packageJson.engines.node) || '14';
  }

  public getDependencies(pj: any): { [property: string]: string } {
    const packageJson: any = pj || this.getPackageJson();
    return (packageJson && packageJson.dependencies) || {};
  }

  public getSpecification(): ISpecType {
    return this.specification;
  }

  public getMetadata(): any {
    return this.metadata;
  }
}

export type EditorContext = BaseEditorContext<any>;
