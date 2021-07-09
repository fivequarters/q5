import { IFunctionSpecification } from './FunctionSpecification';
import { Server } from './Server';

import { EditorContext } from './EditorContext';

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
# timeout=30
# staticIp=false`;

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
export class FunctionEditorContext extends EditorContext<IFunctionSpecification> {
  /**
   * Creates a _EditorContext_ given the optional function specification. If you do not provide a function
   * specification, the default is a boilerplate "hello, world" function.
   * @param specification
   * @ignore Not relevant for MVP
   */
  constructor(
    server: Server<IFunctionSpecification>,
    boundaryId?: string,
    id?: string,
    specification?: IFunctionSpecification
  ) {
    super(server, boundaryId || '', id || '', specification || {});

    if (!this.specification.nodejs) {
      this.specification.nodejs = {
        files: {
          'index.js': IndexPlaceholder,
          'package.json': {
            dependencies: {},
          },
        },
      };
    }

    if (!this.specification.computeSerialized) {
      this.specification.computeSerialized = SettingsComputePlaceholder;
    }
    if (!this.specification.configurationSerialized) {
      this.specification.configurationSerialized = SettingsConfigurationPlaceholder;
    }
    if (!this.specification.scheduleSerialized) {
      this.specification.scheduleSerialized = SettingsCronPlaceholder;
    }
    if (!this._ensureFusebitMetadata().runner) {
      this._ensureFusebitMetadata(true).runner = RunnerPlaceholder;
    }

    if (this.specification.nodejs.files) {
      const metadata = this._ensureFusebitMetadata();
      let fileToSelect = 'index.js';
      let hideFiles: any[] = [];
      if (metadata.editor && typeof metadata.editor.navigationPanel === 'object') {
        hideFiles = metadata.editor.navigationPanel.hideFiles || hideFiles;
        fileToSelect = metadata.editor.navigationPanel.selectFile || fileToSelect;
      }
      if (this.specification.nodejs.files[fileToSelect] && hideFiles.indexOf(fileToSelect) < 0) {
        this.selectFile(fileToSelect);
      } else {
        let foundFileSelect = false;
        for (const name in this.specification.nodejs.files) {
          if (hideFiles.indexOf(name) < 0) {
            this.selectFile(name);
            foundFileSelect = true;
            break;
          }
        }
        if (!foundFileSelect) {
          throw new Error('At least one non-hidden file must be provided in specification.nodejs.files.');
        }
      }
    } else {
      throw new Error('The specification.nodejs.files must be provided.');
    }
  }

  public _ensureFusebitMetadata(create?: boolean): { [property: string]: any } {
    if (!this.specification.metadata) {
      if (create) {
        this.specification.metadata = {};
      } else {
        return {};
      }
    }
    if (!this.specification.metadata.fusebit) {
      if (create) {
        this.specification.metadata.fusebit = {};
      } else {
        return {};
      }
    }
    return this.specification.metadata.fusebit;
  }

  public addFileToSpecification(fileName: string, content: string, overwrite: boolean): void {
    if (!overwrite && this.specification.nodejs!.files[fileName]) {
      throw new Error(`File ${fileName} cannot be added because it already exists.`);
    }
    this.specification.nodejs!.files[fileName] = content;
  }

  public fileExistsInSpecification(fileName: string): boolean {
    return !!(this.specification.nodejs && this.specification.nodejs.files[fileName]);
  }

  public deleteFileFromSpecification(fileName: string): void {
    if (!this.specification.nodejs || !this.specification.nodejs.files[fileName]) {
      throw new Error(`File ${fileName} does not exist.`);
    }
    delete this.specification.nodejs.files[fileName];
  }

  public getFileFromSpecification(fileName: string): string | object {
    return this.specification.nodejs!.files[fileName];
  }

  public setRunnerContent(content: string) {
    this._ensureFusebitMetadata(true).runner = content;
    this.setDirtyState(true);
  }

  public setSettingsCompute(settings: string) {
    const isDirty = !this.dirtyState && this.specification.computeSerialized !== settings;
    this.specification.computeSerialized = settings;
    if (isDirty) {
      this.setDirtyState(true);
    }
  }

  public setSettingsConfiguration(settings: string) {
    const isDirty = !this.dirtyState && this.specification.configurationSerialized !== settings;
    this.specification.configurationSerialized = settings;
    if (isDirty) {
      this.setDirtyState(true);
    }
  }

  public setSettingsSchedule(settings: string) {
    const isDirty = !this.dirtyState && this.specification.scheduleSerialized !== settings;
    this.specification.scheduleSerialized = settings;
    if (isDirty) {
      this.setDirtyState(true);
    }
  }

  public getRunnerContent() {
    return this._ensureFusebitMetadata().runner;
  }

  public getComputeSettings(): string {
    return this.specification.computeSerialized || '';
  }

  public getConfigurationSettings(): string {
    return this.specification.configurationSerialized || '';
  }

  public getConfiguration(): { [index: string]: string | number } {
    return parseKeyValue(this.specification.configurationSerialized || '');
  }

  public getScheduleSettings(): string {
    return this.specification.scheduleSerialized || '';
  }

  public getMetadata(): any {
    return this._ensureFusebitMetadata();
  }

  public getFiles(): { [fileName: string]: string | object } {
    return this.specification.nodejs!.files || {};
  }
}

function parseKeyValue(data: string) {
  try {
    const param = /^\s*([^=]+?)\s*=\s*(.*?)\s*$/;
    const value: { [property: string]: string | number } = {};
    const lines = data.split(/[\r\n]+/);
    lines.forEach((line) => {
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
