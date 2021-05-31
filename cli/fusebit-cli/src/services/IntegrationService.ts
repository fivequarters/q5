import { join } from 'path';
import moment from 'moment';
import globby from 'globby';

import { readFile, readDirectory, exists, copyDirectory, writeFile } from '@5qtrs/file';
import { IExecuteInput } from '@5qtrs/cli';

import { ProfileService } from './ProfileService';
import { ExecuteService } from './ExecuteService';

import { FunctionService } from './FunctionService';

const FusebitStateFile = '.fusebit-state';
const FusebitMetadataFile = 'fusebit.json';

const DefaultIgnores = ['node_modules', FusebitStateFile];

interface IIntegrationSpec {
  id: string;
  data: {
    configuration: {
      package?: string;
      connectors: {
        [name: string]: { package: string; config?: any };
      };
    };
    files: { [fileName: string]: string };
  };
  tags: { [key: string]: string };
  version?: string;
  expires?: moment.Moment;
  expiresDuration?: moment.Duration;
}

export class IntegrationService {
  private profileService: ProfileService;
  private executeService: ExecuteService;
  private input: IExecuteInput;

  private constructor(profileService: ProfileService, executeService: ExecuteService, input: IExecuteInput) {
    this.input = input;
    this.profileService = profileService;
    this.executeService = executeService;
  }

  public static async create(input: IExecuteInput) {
    const executeService = await ExecuteService.create(input);
    const profileService = await ProfileService.create(input);
    return new IntegrationService(profileService, executeService, input);
  }

  public createEmptySpec(): IIntegrationSpec {
    return {
      id: 'unknown id',
      data: { configuration: { connectors: {} }, files: {} },
      tags: {},
    };
  }

  public async loadDirectory(path: string): Promise<IIntegrationSpec> {
    const entitySpec: IIntegrationSpec = this.createEmptySpec();

    const cwd = path || process.cwd();
    // Load package.json, if any.
    let pack: any;
    try {
      const buffer = await readFile(join(cwd, 'package.json'));
      pack = JSON.parse(buffer.toString());
      entitySpec.data.files['package.json'] = JSON.stringify(pack);
    } catch (error) {
      // do nothing
    }

    // Load fusebit.json, if any.
    try {
      const buffer = await readFile(join(cwd, FusebitMetadataFile));
      const config = JSON.parse(buffer.toString());
      entitySpec.data.configuration = config.configuration;
      entitySpec.tags = config.tags;
      entitySpec.expires = config.expires;
      entitySpec.expiresDuration = config.expiresDuration;
    } catch (error) {
      // do nothing
    }

    // Grab the version from the .fusebit-state file, if present.
    try {
      const buffer = await readFile(join(cwd, FusebitStateFile));
      const version = JSON.parse(buffer.toString());

      entitySpec.version = version.version;
    } catch (error) {
      // do nothing
    }

    // Load files in package.files, if any, into the entitySpec.
    const files = await globby((pack && pack.files) || ['*.js'], { cwd, gitignore: true, ignore: DefaultIgnores });
    await Promise.all(
      files.map(async (filename: string) => {
        entitySpec.data.files[filename] = (await readFile(filename)).toString();
      })
    );
    return entitySpec;
  }

  public async writeDirectory(path: string, spec: IIntegrationSpec): Promise<void> {
    const cwd = path || process.cwd();

    // Write the version, if present
    if (spec.version) {
      await writeFile(join(cwd, FusebitStateFile), JSON.stringify({ version: spec.version }));
    }

    // Write all of the files in the specification
    if (spec.data && spec.data.files) {
      await Promise.all(
        Object.entries(spec.data.files).map(async ([filename, contents]: string[]) => {
          await writeFile(join(cwd, filename), contents);
        })
      );
    }

    // Reconstruct the fusebit.json file
    const fusebit: any = {};
    fusebit.configuration = (spec.data && spec.data.configuration) || {};
    fusebit.tags = spec.tags;
    fusebit.expires = spec.expires;
    fusebit.expiresDuration = spec.expiresDuration;
    await writeFile(join(cwd, FusebitMetadataFile), JSON.stringify(fusebit));
  }
}
