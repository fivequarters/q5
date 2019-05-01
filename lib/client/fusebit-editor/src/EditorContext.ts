import { EventEmitter } from '@5qtrs/event';
import { ServerResponse } from 'http';
import * as Events from './Events';
import { IFunctionSpecification, ISchedule } from './FunctionSpecification';
import { IBuildStatus } from './Server';

const RunnerPlaceholder = `// Return a function that evaluates to a Superagent request promise

ctx => Superagent.get(ctx.url)
    .query({ 'x-fx-logs': 1 });

// Simple POST request
// ctx => Superagent.post(ctx.url)
//     .query({ 'x-fx-logs': 1 });
//     .send({ hello: 'world' });

// POST request with Authorization header using function's application settings
// ctx => Superagent.post(ctx.url)
//     .query({ 'x-fx-logs': 1 });
//     .set('Authorization', \`Bearer \${ctx.configuration.MY_API_KEY}\`)
//     .send({ hello: 'world' });
`;

const SettingsApplicationPlaceholder = `# Application settings are available within function code

# KEY1=VALUE1
# KEY2=VALUE2`;

const SettingsComputePlaceholder = `# Compute settings control resources available to the executing function

# memory_size=128
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
 * application settings, schedule of execution (in case of a CRON job), and metadata.
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
   * Not relevant for MVP
   * @ignore
   */
  public dirtyState: boolean = false;
  /**
   * The current state of the in-memory specification of the function. Do not modify this property directly,
   * treat it as read only.
   */
  public functionSpecification: IFunctionSpecification = {};

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
              node: '8',
            },
            dependencies: {},
          },
        },
      };
    }
    if (!this.functionSpecification.lambda) {
      this.functionSpecification.lambda = {
        memory_size: 128,
        timeout: 30,
      };
    }
    if (!this.functionSpecification.configuration) {
      this.functionSpecification.configuration = {};
    }
    if (!this.functionSpecification.metadata) {
      this.functionSpecification.metadata = {};
    }
    if (!this.functionSpecification.metadata.runner) {
      this.functionSpecification.metadata.runner = RunnerPlaceholder;
    }
    if (this.functionSpecification.nodejs.files) {
      if (this.functionSpecification.nodejs.files['index.js']) {
        this.selectFile('index.js');
      } else {
        const fileName = Object.keys(this.functionSpecification.nodejs.files)[0];
        if (fileName) {
          this.selectFile(fileName);
        } else {
          throw new Error('At least one file must be provided in functionSpecification.nodejs.files.');
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
   * Navigates to the Application Settings view.
   */
  public selectSettingsApplication() {
    this._ensureWritable();
    this.selectedFileName = undefined;
    const event = new Events.SettingsApplicationSelectedEvent();
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
  public selectSettingsCron() {
    this._ensureWritable();
    this.selectedFileName = undefined;
    const event = new Events.SettingsCronSelectedEvent();
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
    if (!this.functionSpecification.metadata) {
      this.functionSpecification.metadata = {};
    }
    this.functionSpecification.metadata.runner = content;
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
    const isDirty =
      !this.dirtyState &&
      (!this.functionSpecification.metadata || this.functionSpecification.metadata.computeSettings !== settings);
    this.functionSpecification.lambda = parseKeyValue(settings);
    this.functionSpecification.metadata = this.functionSpecification.metadata || {};
    this.functionSpecification.metadata.computeSettings = settings;
    if (isDirty) {
      this.setDirtyState(true);
    }
  }

  /**
   * Not relevant to MVP
   * @ignore
   */
  public setSettingsApplication(settings: string) {
    this._ensureWritable();
    const isDirty =
      !this.dirtyState &&
      (!this.functionSpecification.metadata || this.functionSpecification.metadata.applicationSettings !== settings);
    this.functionSpecification.configuration = parseKeyValue(settings);
    this.functionSpecification.metadata = this.functionSpecification.metadata || {};
    this.functionSpecification.metadata.applicationSettings = settings;
    if (isDirty) {
      this.setDirtyState(true);
    }
  }

  /**
   * Not relevant to MVP
   * @ignore
   */
  public setSettingsCron(settings: string) {
    this._ensureWritable();
    const isDirty =
      !this.dirtyState &&
      (!this.functionSpecification.metadata || this.functionSpecification.metadata.cronSettings !== settings);
    this.functionSpecification.schedule = <ISchedule>parseKeyValue(settings);
    if (Object.keys(this.functionSpecification.schedule).length === 0) {
      delete this.functionSpecification.schedule;
    }
    this.functionSpecification.metadata = this.functionSpecification.metadata || {};
    this.functionSpecification.metadata.cronSettings = settings;
    if (isDirty) {
      this.setDirtyState(true);
    }
  }

  /**
   * Not relevant to MVP
   * @ignore
   */
  public getRunnerContent() {
    return this.functionSpecification.metadata && this.functionSpecification.metadata.runner;
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
  public buildError(error: Error) {
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
    return this.getSettings('computeSettings', SettingsComputePlaceholder, this.functionSpecification.lambda);
  }

  /**
   * Not relevant to MVP
   * @ignore
   */
  public getApplicationSettings(): string {
    return this.getSettings(
      'applicationSettings',
      SettingsApplicationPlaceholder,
      this.functionSpecification.configuration
    );
  }

  /**
   * Not relevant to MVP
   * @ignore
   */
  public getCronSettings(): string {
    return this.getSettings('cronSettings', SettingsCronPlaceholder, this.functionSpecification.schedule || {});
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

  /**
   * Not relevant to MVP
   * @ignore
   */
  getSettings(
    metadataProperty: string,
    defaultSettings: string,
    effectiveSettings?: { [property: string]: string | number | undefined }
  ): string {
    if (effectiveSettings) {
      // Effective settings always win - if metadata settings are out of sync, adjust them and set dirty state
      let metadataSettings =
        this.functionSpecification.metadata && this.functionSpecification.metadata[metadataProperty];
      let serializedEffectiveSettings = serializeKeyValue(effectiveSettings, defaultSettings);
      if (
        !metadataSettings ||
        serializedEffectiveSettings !== serializeKeyValue(parseKeyValue(<string>metadataSettings), defaultSettings)
      ) {
        this.functionSpecification.metadata = this.functionSpecification.metadata || {};
        metadataSettings = this.functionSpecification.metadata[metadataProperty] = serializedEffectiveSettings;
        this.setDirtyState(true);
      }
      return metadataSettings;
    } else {
      return defaultSettings;
    }
  }
}

function serializeKeyValue(data: { [property: string]: string | number | undefined }, placeholder: string) {
  const lines: string[] = [];
  Object.keys(data)
    .sort()
    .forEach(key => {
      if (data[key]) {
        lines.push(`${key}=${data[key]}`);
      }
    });
  if (lines.length === 0) {
    return placeholder;
  }
  return lines.join('\n');
}

function parseKeyValue(data: string) {
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
}
