import { EOL } from 'os';
import { Command, ArgType, IExecuteInput } from '@5qtrs/cli';
import { request } from '@5qtrs/request';
import { ProfileService, serializeKeyValue, parseKeyValue } from '../../services';
import * as Path from 'path';
import * as Fs from 'fs';

export class FunctionGetCommand extends Command {
  private constructor() {
    super({
      name: 'Get Function',
      cmd: 'get',
      summary: 'Get a deployed function',
      description: [
        `Retrieves details of a deployed function. When --download is specified, function can be saved to disk`,
        `for local development.`,
      ].join(' '),
      options: [
        {
          name: 'function',
          aliases: ['f'],
          description: 'The id of the unction id to retrieve.',
        },
        {
          name: 'download',
          description: [
            'Downloads the function source code and saves it to disk in the specified directory.',
            'Destination directory must be empty or non-existent, unless the --force flag is specified.',
          ].join(' '),
        },
        {
          name: 'force',
          description: 'Enables downloading functions to non-empty directories. Use in conjunction with --download.',
          type: ArgType.boolean,
          default: 'false',
        },
        {
          name: 'show-code',
          aliases: ['c'],
          description: 'Display file contents. If not specified, only file names are listed.',
          type: ArgType.boolean,
          default: 'false',
        },
        {
          name: 'show-configuration',
          aliases: ['n'],
          description: 'Display values of configuration parameters. If not specified, only parameter names are listed.',
          type: ArgType.boolean,
          default: 'false',
        },
      ],
    });
  }

  public static async create() {
    return new FunctionGetCommand();
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    let profileService = await ProfileService.create(input);
    let profile = await profileService.getExecutionProfile(['subscription', 'boundary', 'function']);
    let response = await request({
      url: `${profile.baseUrl}/v1/subscription/${profile.subscription}/boundary/${profile.boundary}/function/${
        profile.function
      }`,
      headers: {
        Authorization: `Bearer ${profile.token}`,
      },
    });
    if (input.options.download) {
      await saveToDisk();
    } else {
      await displayFunction();
    }
    return 0;

    async function saveToDisk(): Promise<void> {
      let destDirectory = Path.join(process.cwd(), input.options.download as string);

      // Ensure directory

      if (Fs.existsSync(destDirectory)) {
        if (!input.options.force && Fs.readdirSync(destDirectory).length > 0) {
          throw new Error(
            `The destination directory ${destDirectory} is not empty. To force the function files to be saved there anyway, use the --force option.`
          );
        }
      } else {
        Fs.mkdirSync(destDirectory, { recursive: true });
      }

      console.log(`Saving function files to ${destDirectory}:`);

      // Save application settings to .env file

      let applicationSettings = getSettings(response.data, 'applicationSettings', response.data.configuration);
      if (applicationSettings) {
        Fs.writeFileSync(Path.join(destDirectory, '.env'), applicationSettings, 'utf8');
        console.log('.env');
        delete response.data.configuration;
        if (response.data.metadata) {
          delete response.data.metadata.applicationSettings;
        }
      }

      // Save individual files

      for (var f in response.data.nodejs.files) {
        let contents = response.data.nodejs.files[f];
        if (typeof contents !== 'string') {
          contents = JSON.stringify(contents, null, 2);
        }
        Fs.writeFileSync(Path.join(destDirectory, f), contents, 'utf8');
        console.log(f);
      }
      delete response.data.nodejs;

      // Save remaining metadata to allow for roundtrip on deploy

      response.data.flxVersion = require('../../../package.json').version;
      Fs.writeFileSync(Path.join(destDirectory, '.flexd.json'), JSON.stringify(response.data, null, 2), 'utf8');
      console.log('.flexd.json');
    }

    async function displayFunction(): Promise<void> {
      console.log('Files:');
      console.log();
      Object.keys(response.data.nodejs.files)
        .sort()
        .forEach(f => {
          console.log(`${f} (${response.data.nodejs.files[f].length} bytes)`);
          if (input.options['show-code']) {
            console.log();
            console.log(response.data.nodejs.files[f]);
            console.log();
          }
        });
      let configurationKeys = Object.keys(response.data.configuration);
      console.log();
      if (configurationKeys.length === 0) {
        console.log('No configuration parameters.');
      } else {
        console.log('Configuration:');
        console.log();
        configurationKeys.forEach(k => {
          if (input.options['show-configuration']) {
            console.log(`${k}=${response.data.configuration[k]}`);
          } else {
            console.log(k);
          }
        });
      }
      console.log();
      console.log('Location:');
      console.log(response.data.location);
    }
  }
}

function getSettings(
  functionSpecification: any,
  metadataProperty: string,
  effectiveSettings?: { [property: string]: string | number | undefined }
): string | undefined {
  if (effectiveSettings) {
    // Effective settings always win - if metadata settings are out of sync, adjust them and set dirty state
    let metadataSettings = functionSpecification.metadata && functionSpecification.metadata[metadataProperty];
    let serializedEffectiveSettings = serializeKeyValue(effectiveSettings);
    if (
      !metadataSettings ||
      serializedEffectiveSettings !== serializeKeyValue(parseKeyValue(<string>metadataSettings))
    ) {
      metadataSettings = serializedEffectiveSettings;
    }
    return metadataSettings;
  }
}
