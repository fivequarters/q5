import { join } from 'path';
import moment from 'moment';
import globby from 'globby';

import { readFile, readDirectory, exists, copyDirectory, writeFile } from '@5qtrs/file';

import { Text } from '@5qtrs/text';
import { IExecuteInput, Confirm } from '@5qtrs/cli';
import { ProfileService } from './ProfileService';
import { ExecuteService } from './ExecuteService';

const FusebitStateFile = '.fusebit-state';
const FusebitMetadataFile = 'fusebit.json';

const DefaultIgnores = ['node_modules', FusebitStateFile, FusebitMetadataFile];

interface IConnectorSpec {
  id: string;
  data: {
    configuration: {
      package?: string;
      muxIntegration?: {
        accountId?: string;
        subscriptionId?: string;
        id?: string;
      };
    };
    files: { [fileName: string]: string };
  };
  tags: { [key: string]: string };
  version?: string;
  expires?: moment.Moment;
  expiresDuration?: moment.Duration;
}

export class ConnectorService {
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
    return new ConnectorService(profileService, executeService, input);
  }

  public createEmptySpec(): IConnectorSpec {
    return {
      id: 'unknown id',
      data: { configuration: { muxIntegration: {} }, files: {} },
      tags: {},
    };
  }

  public async loadDirectory(path: string): Promise<IConnectorSpec> {
    const entitySpec: IConnectorSpec = this.createEmptySpec();

    const cwd = path || process.cwd();

    // Grab the version from the .fusebit-state file, if present.
    try {
      const buffer = await readFile(join(cwd, FusebitStateFile));
      const version = JSON.parse(buffer.toString());

      entitySpec.version = version.version;
    } catch (error) {
      // do nothing
    }

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

    // Load files in package.files, if any, into the entitySpec.
    const files = await globby((pack && pack.files) || ['*.js'], { cwd, gitignore: true, ignore: DefaultIgnores });
    await Promise.all(
      files.map(async (filename: string) => {
        entitySpec.data.files[filename] = (await readFile(filename)).toString();
      })
    );
    return entitySpec;
  }

  public async writeDirectory(path: string, spec: IConnectorSpec): Promise<void> {
    const cwd = path || process.cwd();

    // Write the version, if present
    if (spec.version) {
      await writeFile(join(cwd, FusebitStateFile), JSON.stringify({ version: spec.version }));
    }

    // Reconstruct the fusebit.json file
    const fusebit: any = {};
    fusebit.configuration = (spec.data && spec.data.configuration) || {};
    fusebit.tags = spec.tags;
    fusebit.expires = spec.expires;
    fusebit.expiresDuration = spec.expiresDuration;
    await writeFile(join(cwd, FusebitMetadataFile), JSON.stringify(fusebit));

    // Write all of the files in the specification
    if (spec.data && spec.data.files) {
      await Promise.all(
        Object.entries(spec.data.files).map(async ([filename, contents]: string[]) => {
          await writeFile(join(cwd, filename), contents);
        })
      );
    }
  }

  public async confirmDeploy(path: string, connectorSpec: any, connectorId: string): Promise<void> {
    if (!this.input.options.quiet) {
      const profile = await this.profileService.getExecutionProfile(['account', 'subscription']);

      const files = connectorSpec.data.files || [];
      if (files.length) {
        const confirmPrompt = await Confirm.create({
          header: 'Deploy?',
          message: Text.create("Deploy the connector in the '", Text.bold(path), "' directory?"),
        });
        const confirmed = await confirmPrompt.prompt(this.input.io);
        if (!confirmed) {
          await this.executeService.warning(
            'Deploy Canceled',
            Text.create("Deploying the '", Text.bold(connectorId), "' connector was canceled")
          );
          throw new Error('Deploy Canceled');
        }
      }
    }
  }

  public async deployConnector(connectorId: string, connectorSpec: IConnectorSpec) {
    const profile = await this.profileService.getExecutionProfile(['account', 'subscription']);

    return this.executeService.executeRequest(
      {
        header: 'Deploy Connector',
        message: Text.create("Deploying connector '", Text.bold(`${profile.function}`), "'..."),
        errorHeader: 'Deploy Connector Error',
        errorMessage: Text.create("Unable to deploy connector '", Text.bold(`${profile.function}`), "'"),
      },
      {
        method: 'POST', // XXX How do we figure out this is a PUT?
        url: `${profile.baseUrl}/v2/account/${profile.account}/subscription/${profile.subscription}/connector/${connectorId}`,
        headers: {
          Authorization: `Bearer ${profile.accessToken}`,
        },
        data: connectorSpec,
      }
    );
  }
}
