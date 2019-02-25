import { EventEmitter } from '@5qtrs/event';
import { ServerResponse } from 'http';
import * as Events from './Events';
import { IApplicationSettings, IFunctionSpecification, ILambdaSettings } from './FunctionSpecification';
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

export class Workspace extends EventEmitter {
  public readOnly: boolean = false;
  public selectedFileName: string | undefined = undefined;
  public dirtyState: boolean = false;
  public functionSpecification: IFunctionSpecification = { boundary: '', name: '' };

  constructor(functionSpecification?: IFunctionSpecification) {
    super();
    if (functionSpecification) {
      this.functionSpecification = functionSpecification;
    }
    if (!this.functionSpecification.nodejs) {
      this.functionSpecification.nodejs = {
        files: {
          'index.js': 'module.exports = (ctx, cb) => {\n  cb(null, { body: "Hello" });\n};',
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

  public setReadOnly(value: boolean) {
    if (value !== this.readOnly) {
      this.readOnly = value;
      const event = new Events.ReadOnlyStateChangedEvent(this.readOnly);
      this.emit(event);
    }
  }

  public _ensureWritable() {
    if (this.readOnly) {
      throw new Error('Operation not permitted while workspace is in read-only state.');
    }
  }

  public selectSettingsApplication() {
    this._ensureWritable();
    this.selectedFileName = undefined;
    const event = new Events.SettingsApplicationSelectedEvent();
    this.emit(event);
  }

  public selectSettingsCompute() {
    this._ensureWritable();
    this.selectedFileName = undefined;
    const event = new Events.SettingsComputeSelectedEvent();
    this.emit(event);
  }

  public selectToolsRunner() {
    this._ensureWritable();
    this.selectedFileName = undefined;
    const event = new Events.RunnerSelectedEvent();
    this.emit(event);
  }

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

  public setSelectedFileContent(content: string) {
    this._ensureWritable();
    if (!this.selectedFileName || !this.functionSpecification.nodejs) {
      throw new Error('Cannot set selected file content because no file is selected.');
    }
    this.functionSpecification.nodejs.files[this.selectedFileName] = content;
    this.setDirtyState(true);
  }

  public setRunnerContent(content: string) {
    this._ensureWritable();
    if (!this.functionSpecification.metadata) {
      this.functionSpecification.metadata = {};
    }
    this.functionSpecification.metadata.runner = content;
    this.setDirtyState(true);
  }

  public setDirtyState(state: boolean) {
    this._ensureWritable();
    if (this.dirtyState !== state) {
      this.dirtyState = state;
      const event = new Events.DirtyStateChangedEvent(state);
      this.emit(event);
    }
  }

  public setSettingsCompute(settings: ILambdaSettings) {
    this._ensureWritable();
    const isDirty = !this.dirtyState && JSON.stringify(settings) !== JSON.stringify(this.functionSpecification.lambda);
    this.functionSpecification.lambda = settings;
    if (isDirty) {
      this.setDirtyState(true);
    }
  }

  public setSettingsApplication(settings: IApplicationSettings) {
    this._ensureWritable();
    const isDirty =
      !this.dirtyState && JSON.stringify(settings) !== JSON.stringify(this.functionSpecification.configuration);
    this.functionSpecification.configuration = settings;
    if (isDirty) {
      this.setDirtyState(true);
    }
  }

  public getRunnerContent() {
    return this.functionSpecification.metadata && this.functionSpecification.metadata.runner;
  }

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
    status.progress = 1;
    const event = new Events.BuildFinishedEvent(status);
    this.emit(event);
  }

  public buildError(error: Error) {
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

  public serverLogsAttached() {
    const event = new Events.LogsAttached();
    this.emit(event);
  }

  public serverLogsDetached(error?: Error) {
    const event = new Events.LogsDetached(error);
    this.emit(event);
  }

  public serverLogsEntry(data: string) {
    const event = new Events.LogsEntry(data);
    this.emit(event);
  }
}
