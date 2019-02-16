import { EventEmitter } from '@5qtrs/event';
import * as Events from './Events';
import { FunctionSpecification, LambdaSettings, ApplicationSettings } from './FunctionSpecification';
import { BuildStatus } from './Server';
import { ServerResponse } from 'http';

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
  readOnly: boolean = false;
  selectedFileName: string | undefined = undefined;
  dirtyState: boolean = false;
  functionSpecification: FunctionSpecification = { boundary: '', name: '' };

  constructor(functionSpecification?: FunctionSpecification) {
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
        let fileName = Object.keys(this.functionSpecification.nodejs.files)[0];
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

  setReadOnly(value: boolean) {
    if (value !== this.readOnly) {
      this.readOnly = value;
      let event = new Events.ReadOnlyStateChangedEvent(this.readOnly);
      this.emit(event);
    }
  }

  _ensureWritable() {
    if (this.readOnly) {
      throw new Error('Operation not permitted while workspace is in read-only state.');
    }
  }

  selectSettingsApplication() {
    this._ensureWritable();
    this.selectedFileName = undefined;
    let event = new Events.SettingsApplicationSelectedEvent();
    this.emit(event);
  }

  selectSettingsCompute() {
    this._ensureWritable();
    this.selectedFileName = undefined;
    let event = new Events.SettingsComputeSelectedEvent();
    this.emit(event);
  }

  selectToolsRunner() {
    this._ensureWritable();
    this.selectedFileName = undefined;
    let event = new Events.RunnerSelectedEvent();
    this.emit(event);
  }

  addFile(fileName: string) {
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
    let event = new Events.FileAddedEvent(fileName);
    this.emit(event);
    this.setDirtyState(true);
  }

  deleteFile(fileName: string) {
    this._ensureWritable();
    if (!this.functionSpecification.nodejs || !this.functionSpecification.nodejs.files[fileName]) {
      throw new Error(`File ${fileName} does not exist.`);
    }
    let event = new Events.FileDeletedEvent(fileName);
    this.emit(event);
    this.setDirtyState(true);
    if (this.selectedFileName === fileName) {
      this.selectedFileName = undefined;
    }
    delete this.functionSpecification.nodejs.files[fileName];
  }

  selectFile(fileName: string) {
    this._ensureWritable();
    if (fileName === this.selectedFileName) {
      return;
    }
    if (!this.functionSpecification.nodejs || !this.functionSpecification.nodejs.files[fileName]) {
      throw new Error(`File ${fileName} does not exist in the function specification.`);
    }
    this.selectedFileName = fileName;
    let event = new Events.FileSelectedEvent(fileName);
    this.emit(event);
  }

  setSelectedFileContent(content: string) {
    this._ensureWritable();
    if (!this.selectedFileName || !this.functionSpecification.nodejs) {
      throw new Error('Cannot set selected file content because no file is selected.');
    }
    this.functionSpecification.nodejs.files[this.selectedFileName] = content;
    this.setDirtyState(true);
  }

  setRunnerContent(content: string) {
    this._ensureWritable();
    if (!this.functionSpecification.metadata) {
      this.functionSpecification.metadata = {};
    }
    this.functionSpecification.metadata.runner = content;
    this.setDirtyState(true);
  }

  setDirtyState(state: boolean) {
    this._ensureWritable();
    if (this.dirtyState !== state) {
      this.dirtyState = state;
      let event = new Events.DirtyStateChangedEvent(state);
      this.emit(event);
    }
  }

  setSettingsCompute(settings: LambdaSettings) {
    this._ensureWritable();
    var isDirty = !this.dirtyState && JSON.stringify(settings) !== JSON.stringify(this.functionSpecification.lambda);
    this.functionSpecification.lambda = settings;
    if (isDirty) {
      this.setDirtyState(true);
    }
  }

  setSettingsApplication(settings: ApplicationSettings) {
    this._ensureWritable();
    var isDirty =
      !this.dirtyState && JSON.stringify(settings) !== JSON.stringify(this.functionSpecification.configuration);
    this.functionSpecification.configuration = settings;
    if (isDirty) {
      this.setDirtyState(true);
    }
  }

  getRunnerContent() {
    return this.functionSpecification.metadata && this.functionSpecification.metadata.runner;
  }

  getSelectedFileContent() {
    if (!this.selectedFileName) {
      return undefined;
    }
    let content = this.functionSpecification.nodejs && this.functionSpecification.nodejs.files[this.selectedFileName];
    if (typeof content === 'string') {
      return content;
    } else if (content && typeof content === 'object') {
      return JSON.stringify(content, null, 2);
    } else {
      return undefined;
    }
  }

  getSelectedFileLanguage() {
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

  startBuild() {
    let event = new Events.BuildStartedEvent();
    this.emit(event);
  }

  buildProgress(status: BuildStatus) {
    let event = new Events.BuildProgressEvent(status);
    this.emit(event);
  }

  buildFinished(status: BuildStatus) {
    status.progress = 1;
    let event = new Events.BuildFinishedEvent(status);
    this.emit(event);
  }

  buildError(error: Error) {
    let event = new Events.BuildErrorEvent(error);
    this.emit(event);
  }

  startRun(url: string) {
    let event = new Events.RunnerStartedEvent(url);
    this.emit(event);
  }

  finishRun(error?: Error, res?: ServerResponse) {
    let event = new Events.RunnerFinishedEvent(error, res);
    this.emit(event);
  }

  updateLogsState(state: boolean) {
    let event = new Events.LogsStateChangedEvent(state);
    this.emit(event);
  }

  updateNavState(state: boolean) {
    let event = new Events.NavStateChangedEvent(state);
    this.emit(event);
  }

  setFullScreen(state: boolean) {
    let event = new Events.FullScreenChangedEvent(state);
    this.emit(event);
  }

  close() {
    let event = new Events.ClosedEvent();
    this.emit(event);
  }

  serverLogsAttached() {
    let event = new Events.LogsAttached();
    this.emit(event);
  }

  serverLogsDetached(error?: Error) {
    let event = new Events.LogsDetached(error);
    this.emit(event);
  }

  serverLogsEntry(data: string) {
    let event = new Events.LogsEntry(data);
    this.emit(event);
  }
}
