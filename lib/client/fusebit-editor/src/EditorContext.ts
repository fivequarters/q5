import { EventEmitter } from '@5qtrs/event';
import { ServerResponse } from 'http';
import * as Events from './Events';
import { IFunctionSpecification } from './FunctionSpecification';
import { IBuildStatus } from './Server';

const RunnerPlaceholder = `// Return a function that evaluates to a Superagent request promise

ctx => Superagent.get(ctx.url);

// Simple POST request
// ctx => Superagent.post(ctx.url)
//     .send({ hello: 'world' });

// POST request with Authorization header using function's application settings
// ctx => Superagent.post(ctx.url)
//     .set('Authorization', \`Bearer \${ctx.configuration.MY_API_KEY}\`)
//     .send({ hello: 'world' });
`;

const SettingsConfigurationPlaceholder = `# Configuration settings are available within function code

# KEY1=VALUE1
# KEY2=VALUE2`;

const SettingsComputePlaceholder = `# Compute settings control resources available to the executing function

# memorySize=128
# timeout=30`;

const SettingsCronPlaceholder = `# Set the 'cron' value to execute this function on a schedule

# Check available timezone identifiers at https://en.wikipedia.org/wiki/List_of_tz_database_time_zones
# Default is UTC.
# timezone=US/Pacific

# Design a CRON schedule at https://crontab.guru/

# Every day at midnight
# cron=0 0 * * *

# Every day at 5am
# cron=0 5 * * *

# Every hour
# cron=0 */1 * * *

# Every 15 minutes
# cron=*/15 * * * *

# At 10pm every Friday
# cron=0 22 * * Fri
`;

const IndexPlaceholder = `/**
* @param ctx {FusebitContext}
* @param cb {FusebitCallback}
*/
module.exports = (ctx, cb) => {
    cb(null, { body: "Hello" });
};
`;

/**
 * The _EditorContext_ class class represents client side state of a single function, including its files,
 * configuration settings, schedule of execution (in case of a CRON job), and metadata.
 * It exposes methods to manipulate this in-memory state, and emits events other components can subscribe to when
 * that state changes.
 *
 * The _EditorContext_ is an _EventEmitter_ that emits events on changes in the function specification and interactions
 * with the Fusebit HTTP APIs. For the full list of of events that can be subscribed to, see [[Events]].
 */
export class EditorContext extends EventEmitter {
  /**
   * Name of the function, unique within the boundary.
   */
  public functionId: string = '';
  /**
   * Isolation boundary within which this function executes. Functions running in different boundaries are guaranteed to be isolated.
   * Functions running in the same boundary may or may not be isolated.
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
   * The current state of the in-memory specification of the function. Do not modify this property directly,
   * treat it as read only.
   */
  public functionSpecification: IFunctionSpecification = {};

  /**
   * Not relevant for MVP
   * @ignore
   */
  public _monaco: any;

  /**
   * Creates a _EditorContext_ given the optional function specification. If you do not provide a function specification,
   * the default is a boilerplate "hello, world" function.
   * @param functionSpecification
   * @ignore Not relevant for MVP
   */
  constructor(boundaryId?: string, id?: string, functionSpecification?: IFunctionSpecification) {
    super();
    if (boundaryId) {
      this.boundaryId = boundaryId;
    }
    if (id) {
      this.functionId = id;
    }
    if (functionSpecification) {
      this.functionSpecification = functionSpecification;
    }
    if (!this.functionSpecification.nodejs) {
      this.functionSpecification.nodejs = {
        files: {
          'index.js': IndexPlaceholder,
          'package.json': {
            engines: {
              node: '10',
            },
            dependencies: {},
          },
        },
      };
    }
    if (!this._ensureFusebitMetadata().runner) {
      this._ensureFusebitMetadata(true).runner = RunnerPlaceholder;
    }
    if (this.functionSpecification.nodejs.files) {
      const metadata = this._ensureFusebitMetadata();
      let fileToSelect = 'index.js';
      let hideFiles: any[] = [];
      if (metadata.editor && typeof metadata.editor.navigationPanel === 'object') {
        hideFiles = metadata.editor.navigationPanel.hideFiles || hideFiles;
        fileToSelect = metadata.editor.navigationPanel.selectFile || fileToSelect;
      }
      if (this.functionSpecification.nodejs.files[fileToSelect] && hideFiles.indexOf(fileToSelect) < 0) {
        this.selectFile(fileToSelect);
      } else {
        let foundFileSelect = false;
        for (var name in this.functionSpecification.nodejs.files) {
          if (hideFiles.indexOf(name) < 0) {
            this.selectFile(name);
            foundFileSelect = true;
            break;
          }
        }
        if (!foundFileSelect) {
          throw new Error('At least one non-hidden file must be provided in functionSpecification.nodejs.files.');
        }
      }
    } else {
      throw new Error('The functionSpecification.nodejs.files must be provided.');
    }
  }

  /**
   * Not relevant for MVP
   * @ignore
   */
  public setReadOnly(value: boolean) {
    if (value !== this.readOnly) {
      this.readOnly = value;
      const event = new Events.ReadOnlyStateChangedEvent(this.readOnly);
      this.emit(event);
    }
  }

  /**
   * Not relevant for MVP
   * @ignore
   */
  public _ensureWritable() {
    if (this.readOnly) {
      throw new Error('Operation not permitted while the editor context is in read-only state.');
    }
  }

  /**
   * Not relevant for MVP
   * @ignore
   */
  public _ensureFusebitMetadata(create?: boolean): { [property: string]: any } {
    if (!this.functionSpecification.metadata) {
      if (create) {
        this.functionSpecification.metadata = {};
      } else {
        return {};
      }
    }
    if (!this.functionSpecification.metadata.fusebit) {
      if (create) {
        this.functionSpecification.metadata.fusebit = {};
      } else {
        return {};
      }
    }
    return this.functionSpecification.metadata.fusebit;
  }

  /**
   * Navigates to the Configuration Settings view.
   */
  public selectSettingsConfiguration() {
    this._ensureWritable();
    this.selectedFileName = undefined;
    const event = new Events.SettingsConfigurationSelectedEvent();
    this.emit(event);
  }

  /**
   * Not relevant for MVP
   * @ignore
   */
  public selectSettingsCompute() {
    this._ensureWritable();
    this.selectedFileName = undefined;
    const event = new Events.SettingsComputeSelectedEvent();
    this.emit(event);
  }

  /**
   * Navigates to the Schedule view.
   */
  public selectSettingsSchedule() {
    this._ensureWritable();
    this.selectedFileName = undefined;
    const event = new Events.SettingsScheduleSelectedEvent();
    this.emit(event);
  }

  /**
   * Navigates to the Runner view.
   */
  public selectToolsRunner() {
    this._ensureWritable();
    this.selectedFileName = undefined;
    const event = new Events.RunnerSelectedEvent();
    this.emit(event);
  }

  /**
   * Not relevant to MVP
   * @ignore
   */
  public addFile(fileName: string) {
    this._ensureWritable();
    if (!this.functionSpecification.nodejs) {
      this.functionSpecification.nodejs = { files: {} };
    }
    if (this.functionSpecification.nodejs.files[fileName]) {
      throw new Error(`File ${fileName} cannot be added because it already exists.`);
    }
    let content: string = `# ${fileName}`;
    if (fileName.match(/\.js$/)) {
      content = `module.exports = () => {};`;
    } else if (fileName.match(/\.json$/)) {
      content = `{}`;
    }
    this.functionSpecification.nodejs.files[fileName] = content;
    const event = new Events.FileAddedEvent(fileName);
    this.emit(event);
    this.setDirtyState(true);
  }

  /**
   * Not relevant to MVP
   * @ignore
   */
  public deleteFile(fileName: string) {
    this._ensureWritable();
    if (!this.functionSpecification.nodejs || !this.functionSpecification.nodejs.files[fileName]) {
      throw new Error(`File ${fileName} does not exist.`);
    }
    const event = new Events.FileDeletedEvent(fileName);
    this.emit(event);
    this.setDirtyState(true);
    if (this.selectedFileName === fileName) {
      this.selectedFileName = undefined;
    }
    delete this.functionSpecification.nodejs.files[fileName];
  }

  /**
   * Navigates to edit a specific file. The file name must exist in the [[functionSpecification]].
   * @param fileName The name of the file to edit.
   */
  public selectFile(fileName: string) {
    this._ensureWritable();
    if (fileName === this.selectedFileName) {
      return;
    }
    if (!this.functionSpecification.nodejs || !this.functionSpecification.nodejs.files[fileName]) {
      throw new Error(`File ${fileName} does not exist in the function specification.`);
    }
    this.selectedFileName = fileName;
    const event = new Events.FileSelectedEvent(fileName);
    this.emit(event);
  }

  /**
   * Not relevant to MVP
   * @ignore
   */
  public setSelectedFileContent(content: string) {
    this._ensureWritable();
    if (!this.selectedFileName || !this.functionSpecification.nodejs) {
      throw new Error('Cannot set selected file content because no file is selected.');
    }
    this.functionSpecification.nodejs.files[this.selectedFileName] = content;
    this.setDirtyState(true);
  }

  /**
   * Not relevant to MVP
   * @ignore
   */
  public setRunnerContent(content: string) {
    this._ensureWritable();
    this._ensureFusebitMetadata(true).runner = content;
    this.setDirtyState(true);
  }

  /**
   * Not relevant to MVP
   * @ignore
   */
  public setDirtyState(state: boolean) {
    this._ensureWritable();
    if (this.dirtyState !== state) {
      this.dirtyState = state;
      const event = new Events.DirtyStateChangedEvent(state);
      this.emit(event);
    }
  }

  /**
   * Not relevant to MVP
   * @ignore
   */
  public setSettingsCompute(settings: string) {
    this._ensureWritable();
    const isDirty = !this.dirtyState && this.functionSpecification.computeSerialized !== settings;
    this.functionSpecification.computeSerialized = settings;
    if (isDirty) {
      this.setDirtyState(true);
    }
  }

  /**
   * Not relevant to MVP
   * @ignore
   */
  public setSettingsConfiguration(settings: string) {
    this._ensureWritable();
    const isDirty = !this.dirtyState && this.functionSpecification.configurationSerialized !== settings;
    this.functionSpecification.configurationSerialized = settings;
    if (isDirty) {
      this.setDirtyState(true);
    }
  }

  /**
   * Not relevant to MVP
   * @ignore
   */
  public setSettingsSchedule(settings: string) {
    this._ensureWritable();
    const isDirty = !this.dirtyState && this.functionSpecification.scheduleSerialized !== settings;
    this.functionSpecification.scheduleSerialized = settings;
    if (isDirty) {
      this.setDirtyState(true);
    }
  }

  /**
   * Not relevant to MVP
   * @ignore
   */
  public getRunnerContent() {
    return this._ensureFusebitMetadata().runner;
  }

  /**
   * Not relevant to MVP
   * @ignore
   */
  public getSelectedFileContent() {
    if (!this.selectedFileName) {
      return undefined;
    }
    const content = this.functionSpecification.nodejs && this.functionSpecification.nodejs.files[this.selectedFileName];
    if (typeof content === 'string') {
      return content;
    } else if (content && typeof content === 'object') {
      return JSON.stringify(content, null, 2);
    } else {
      return undefined;
    }
  }

  /**
   * Not relevant to MVP
   * @ignore
   */
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

  /**
   * Not relevant to MVP
   * @ignore
   */
  public startBuild() {
    const event = new Events.BuildStartedEvent();
    this.emit(event);
  }

  /**
   * Not relevant to MVP
   * @ignore
   */
  public buildProgress(status: IBuildStatus) {
    const event = new Events.BuildProgressEvent(status);
    this.emit(event);
  }

  /**
   * Not relevant to MVP
   * @ignore
   */
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

  /**
   * Not relevant to MVP
   * @ignore
   */
  public buildError(error: Events.IError) {
    const event = new Events.BuildErrorEvent(error);
    this.emit(event);
  }

  /**
   * Not relevant to MVP
   * @ignore
   */
  public startRun(url: string) {
    const event = new Events.RunnerStartedEvent(url);
    this.emit(event);
  }

  /**
   * Not relevant to MVP
   * @ignore
   */
  public finishRun(error?: Error, res?: ServerResponse) {
    const event = new Events.RunnerFinishedEvent(error, res);
    this.emit(event);
  }

  /**
   * Not relevant to MVP
   * @ignore
   */
  public updateLogsState(state: boolean) {
    const event = new Events.LogsStateChangedEvent(state);
    this.emit(event);
  }

  /**
   * Not relevant to MVP
   * @ignore
   */
  public updateNavState(state: boolean) {
    const event = new Events.NavStateChangedEvent(state);
    this.emit(event);
  }

  /**
   * Not relevant to MVP
   * @ignore
   */
  public setFullScreen(state: boolean) {
    const event = new Events.FullScreenChangedEvent(state);
    this.emit(event);
  }

  /**
   * Not relevant to MVP
   * @ignore
   */
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

  /**
   * Not relevant to MVP
   * @ignore
   */
  public serverLogsAttached() {
    const event = new Events.LogsAttachedEvent();
    this.emit(event);
  }

  /**
   * Not relevant to MVP
   * @ignore
   */
  public serverLogsDetached(error?: Error) {
    const event = new Events.LogsDetachedEvent(error);
    this.emit(event);
  }

  /**
   * Not relevant to MVP
   * @ignore
   */
  public serverLogsEntry(data: string) {
    const event = new Events.LogsEntryEvent(data);
    this.emit(event);
  }

  /**
   * Not relevant to MVP
   * @ignore
   */
  public getComputeSettings(): string {
    return this.functionSpecification.computeSerialized || '';
  }

  /**
   * Not relevant to MVP
   * @ignore
   */
  public getConfigurationSettings(): string {
    return this.functionSpecification.configurationSerialized || '';
  }

  /**
   * Not relevant to MVP
   * @ignore
   */
  public getConfiguration(): { [index: string]: string | number } {
    return parseKeyValue(this.functionSpecification.configurationSerialized || '');
  }

  /**
   * Not relevant to MVP
   * @ignore
   */
  public getScheduleSettings(): string {
    return this.functionSpecification.scheduleSerialized || '';
  }

  /**
   * Not relevant to MVP
   * @ignore
   */
  public getPackageJson(): any {
    let packageJson: any = this.functionSpecification.nodejs && this.functionSpecification.nodejs.files['package.json'];
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
  /**
   * Not relevant to MVP
   * @ignore
   */
  getNodeVersion(pj: any): string {
    let packageJson: any = pj || this.getPackageJson();
    return (packageJson && packageJson.engines && packageJson.engines.node) || '8';
  }

  /**
   * Not relevant to MVP
   * @ignore
   */
  getDependencies(pj: any): { [property: string]: string } {
    let packageJson: any = pj || this.getPackageJson();
    return (pj && pj.dependencies) || {};
  }
}

function parseKeyValue(data: string) {
  try {
    const param = /^\s*([^=]+?)\s*=\s*(.*?)\s*$/;
    const value: { [property: string]: string | number } = {};
    const lines = data.split(/[\r\n]+/);
    lines.forEach(line => {
      if (/^\s*\#/.test(line)) {
        return;
      }
      const match = line.match(param);
      if (match) {
        value[match[1]] = match[2];
      }
    });
    return value;
  } catch (__) {
    return {};
  }
}
