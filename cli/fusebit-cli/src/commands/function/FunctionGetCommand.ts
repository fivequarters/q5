import { Command, ArgType, IExecuteInput, Message, MessageKind } from '@5qtrs/cli';
import { request } from '@5qtrs/request';
import {
  ProfileService,
  serializeKeyValue,
  parseKeyValue,
  ExecuteService,
  VersionService,
  tryGetFusebit,
  getProfileSettingsFromFusebit,
} from '../../services';
import { ensureFusebitMetadata } from '../../services/Utilities';
import * as Path from 'path';
import * as Fs from 'fs';
import { Text } from '@5qtrs/text';
import { Table } from '@5qtrs/table';

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
          description: 'The id of the function to retrieve.',
        },
        {
          name: 'download',
          aliases: ['d'],
          description: [
            'Downloads the source code of the function and saves it to disk in the current working directory.',
            'You can set a different destination directory using --dir. Destination directory must be empty or non-existent, unless the --force flag is specified.',
          ].join(' '),
          type: ArgType.boolean,
          default: 'false',
        },
        {
          name: 'dir',
          aliases: ['i'],
          description: 'The destination directory for saving the function when --download is used.',
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
    await input.io.writeLine();

    let profileService = await ProfileService.create(input);
    const executeService = await ExecuteService.create(input);
    const versionService = await VersionService.create(input);

    let profile = await profileService.getExecutionProfile(
      ['subscription', 'boundary', 'function'],
      input.options.download ? undefined : getProfileSettingsFromFusebit(tryGetFusebit())
    );

    const version = await versionService.getVersion();

    const result = await executeService.execute(
      {
        header: 'Get Function',
        message: Text.create(
          'Get function ',
          Text.bold(`${profile.boundary}/${profile.function}`),
          ' on account ',
          Text.bold(profile.account || ''),
          ' and subscription ',
          Text.bold(profile.subscription || ''),
          '.'
        ),
        errorHeader: 'Get Function Error',
        errorMessage: 'Unable to get the function',
      },
      async () => {
        let response = await request({
          url: `${profile.baseUrl}/v1/account/${profile.account}/subscription/${profile.subscription}/boundary/${
            profile.boundary
          }/function/${profile.function}`,
          headers: {
            Authorization: `Bearer ${profile.accessToken}`,
            'User-Agent': `fusebit-cli/${version}`,
          },
          validStatus: status => status === 200,
        });
        if (input.options.download) {
          await saveToDisk();
        } else {
          if (input.options.dir) {
            await (await Message.create({
              header: '--dir',
              message: `The --dir option is ignored when --download is not specified.`,
              kind: MessageKind.warning,
            })).write(input.io);
          }
          await displayFunction();
        }
        return 0;

        async function saveToDisk(): Promise<void> {
          if (!input.options.dir) {
            input.options.dir = '.';
          }
          let destDirectory = Path.join(process.cwd(), input.options.dir as string);

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

          input.io.writeLine(Text.create(['Saving function to ', Text.bold(destDirectory), '...', Text.eol()]));

          // Save application settings to .env file

          let applicationSettings = getSettings(response.data, 'applicationSettings', response.data.configuration);
          if (applicationSettings) {
            Fs.writeFileSync(Path.join(destDirectory, '.env'), applicationSettings, 'utf8');
            input.io.writeLine('.env');
            delete response.data.configuration;
            delete ensureFusebitMetadata(response.data).applicationSettings;
          }

          // Save individual files

          let files = Object.keys(response.data.nodejs.files).sort();
          for (let i = 0; i < files.length; i++) {
            let f = files[i];
            let contents = response.data.nodejs.files[f];
            if (typeof contents !== 'string') {
              contents = JSON.stringify(contents, null, 2);
            }
            Fs.writeFileSync(Path.join(destDirectory, f), contents, 'utf8');
            input.io.writeLine(f);
          }
          delete response.data.nodejs;

          // Save remaining metadata to allow for roundtrip on deploy

          response.data.fuseVersion = version;
          Fs.writeFileSync(Path.join(destDirectory, 'fusebit.json'), JSON.stringify(response.data, null, 2), 'utf8');
          input.io.writeLine('fusebit.json');

          input.io.writeLine();
          input.io.writeLine(Text.green('Done.'));
        }

        async function displayFunction(): Promise<void> {
          await (await Message.create({ message: Text.bold('Files:') })).write(input.io);
          let files = Object.keys(response.data.nodejs.files).sort();
          if (input.options['show-code']) {
            for (let i = 0; i < files.length; i++) {
              let f = files[i];
              let c = response.data.nodejs.files[f];
              await (await Message.create({
                header: f,
                message: `${c.length || JSON.stringify(c).length} bytes`,
              })).write(input.io);
              let message = typeof c === 'string' ? c : JSON.stringify(c, null, 2);
              await (await Message.create({ message })).write(input.io);
            }
          } else {
            const table = await Table.create({
              width: input.io.outputWidth,
              count: 2,
              gutter: Text.dim('  │  '),
              columns: [{ flexShrink: 0, flexGrow: 0 }, { flexGrow: 1 }],
            });

            for (let i = 0; i < files.length; i++) {
              let f = files[i];
              let c = response.data.nodejs.files[f];
              table.addRow([f, `${c.length || JSON.stringify(c).length} bytes`]);
            }

            await input.io.writeLine(table.toText());
            await input.io.writeLine();
          }

          let configurationKeys = Object.keys(response.data.configuration);
          if (configurationKeys.length === 0) {
            await (await Message.create({ message: Text.bold('No configuration parameters.') })).write(input.io);
          } else {
            await (await Message.create({ message: Text.bold('Configuration:') })).write(input.io);
            const table = await Table.create({
              width: input.io.outputWidth,
              count: 2,
              gutter: Text.dim('  │  '),
              columns: [{ flexShrink: 0, flexGrow: 0 }, { flexGrow: 1 }],
            });
            for (var k in configurationKeys) {
              table.addRow([
                configurationKeys[k],
                input.options['show-configuration'] ? response.data.configuration[configurationKeys[k]] : '*****',
              ]);
            }
            await input.io.writeLine(table.toText());
            await input.io.writeLine();

            let cronKeys = Object.keys(response.data.schedule);
            if (cronKeys.length === 0) {
              await (await Message.create({
                message: Text.bold('The function does not have a schedule of execution.'),
              })).write(input.io);
            } else {
              await (await Message.create({ message: Text.bold('Schedule:') })).write(input.io);
              const table = await Table.create({
                width: input.io.outputWidth,
                count: 2,
                gutter: Text.dim('  │  '),
                columns: [{ flexShrink: 0, flexGrow: 0 }, { flexGrow: 1 }],
              });
              table.addRow(['CRON', response.data.schedule.cron]);
              table.addRow(['Timezone', response.data.schedule.timezone || 'UTC']);
              await input.io.writeLine(table.toText());
              await input.io.writeLine();
            }
          }
          await (await Message.create({ message: Text.bold('Location:') })).write(input.io);
          await (await Message.create({ message: Text.blue(response.data.location) })).write(input.io);
        }
      }
    );

    return result || 1;
  }
}

function getSettings(
  functionSpecification: any,
  metadataProperty: string,
  effectiveSettings?: { [property: string]: string | number | undefined }
): string | undefined {
  if (effectiveSettings) {
    // Effective settings always win - if metadata settings are out of sync, adjust them and set dirty state
    let metadataSettings = ensureFusebitMetadata(functionSpecification)[metadataProperty];
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
