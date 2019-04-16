import { EOL } from 'os';
import { Command, ArgType, IExecuteInput, Message, MessageKind } from '@5qtrs/cli';
import { request, IHttpResponse } from '@5qtrs/request';
import {
  ProfileService,
  serializeKeyValue,
  parseKeyValue,
  ExecuteService,
  tryGetFlexd,
  getProfileSettingsFromFlexd,
} from '../../services';
import * as Path from 'path';
import * as Fs from 'fs';
import { Text } from '@5qtrs/text';
import { Table } from '@5qtrs/table';

export class FunctionDeployCommand extends Command {
  private constructor() {
    super({
      name: 'Deploy Function',
      cmd: 'deploy',
      summary: 'Deploy a function',
      description: [
        'Builds and deploys a function using files in the specified directory.',
        `${EOL}${EOL}A minimal function must include the index.js file.`,
        'You can specify function configuration using the .env file, and NPM module dependenies using',
        'the package.json file. All files must be located directly in the specified directory; subdirectories',
        'are not considered.',
        `${EOL}${EOL}If the source directory contains .flexd.json file with metadata of an existing function,`,
        'that metadata is used, but can be overriden using command line options. The .flexd.json file is created',
        'when you run the `flx function get` command to download an existing function.',
      ].join(' '),
      arguments: [
        {
          name: 'source',
          description: [
            'A path to the directory with the function source code to deploy.',
            `If not specified, the current working directory is used.`,
          ].join(' '),
          required: false,
        },
      ],
      options: [
        {
          name: 'function',
          aliases: ['f'],
          description: 'The id of the function deploy.',
        },
        {
          name: 'cron',
          description: [
            'The cron schedule to use to invoke the function, or "off" to turn the cron off. Construct a CRON string at https://crontab.guru/.',
            'For example: --cron "0 */1 * * *" runs every hour, --cron "*/15 * * * *" runs every 15 minutes, --cron "off" turns the cron off.',
          ].join(' '),
        },
        {
          name: 'timezone',
          description: [
            'The timezone to use when invoking the function with the cron schedule.',
            'Check valid timezones at https://en.wikipedia.org/wiki/List_of_tz_database_time_zones',
          ].join(' '),
        },
        {
          name: 'confirm',
          aliases: ['c'],
          description: [
            'If set to true, the function will be deployed without asking for confirmation of the details.',
          ].join(' '),
          type: ArgType.boolean,
          default: 'false',
        },
      ],

      modes: [],
    });
  }

  public static async create() {
    return new FunctionDeployCommand();
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    await input.io.writeLine();

    let profileService = await ProfileService.create(input);
    const executeService = await ExecuteService.create(input);
    let sourceDirectory = Path.join(process.cwd(), (input.arguments[0] as string) || '');
    let flexd = tryGetFlexd(sourceDirectory);
    let profile = await profileService.getExecutionProfile(
      ['subscription', 'boundary', 'function'],
      getProfileSettingsFromFlexd(flexd)
    );

    if (!flexd) {
      flexd = {
        lambda: {
          memory_size: 128,
          timeout: 30,
        },
      };
    }
    if (flexd.lambda) {
      flexd.metadata = flexd.metadata || {};
      flexd.metadata.computeSettings = serializeKeyValue(flexd.lambda);
    }

    await executeService.execute(
      {
        header: 'Deploy Function',
        message: Text.create(
          'Deploying function ',
          Text.bold(`${profile.boundary}/${profile.function}`),
          ' on account ',
          Text.bold(profile.account || ''),
          ' and subscription ',
          Text.bold(profile.subscription || ''),
          '.'
        ),
        errorHeader: 'Deploy Function Error',
        errorMessage: 'Unable to deploy the function',
      },
      async () => {
        let tmp: any = {
          nodejs: { files: {} },
        };
        ['lambda', 'metadata', 'schedule'].forEach(x => {
          if (flexd[x]) tmp[x] = flexd[x];
        });
        flexd = tmp;
        if (flexd.schedule && Object.keys(flexd.schedule).length === 0) {
          delete flexd.schedule;
        }

        if (input.options.cron) {
          if ((<string>input.options.cron).match(/^off$/i)) {
            delete flexd.schedule;
            if (flexd.metadata) {
              delete flexd.metadata.cronSettings;
            }
          } else {
            flexd.schedule = flexd.schedule || {};
            flexd.schedule.cron = input.options.cron;
            if (input.options.timezone) {
              flexd.schedule.timezone = input.options.timezone;
              flexd.metadata = flexd.metadata || {};
              flexd.metadata.cronSettings = serializeKeyValue(flexd.schedule);
            }
          }
        } else if (input.options.timezone) {
          throw new Error('If you specify --timezone, you must also specify --cron.');
        }

        let files = Fs.readdirSync(sourceDirectory, { withFileTypes: true });
        for (var i = 0; i < files.length; i++) {
          var f = files[i];
          if (!f.isFile()) {
            if (f.name !== '.flexd') {
              await (await Message.create({
                header: f.name,
                message: `Ignoring`,
                kind: MessageKind.warning,
              })).write(input.io);
            } else {
              await (await Message.create({
                header: f.name,
                message: `The .flexd/function.json is present, defaults specified in this file are used.`,
                kind: MessageKind.info,
              })).write(input.io);
            }
            continue;
          }
          if (f.name === '.gitignore') {
            continue;
          }
          let content = Fs.readFileSync(Path.join(sourceDirectory, f.name), 'utf8');
          if (f.name === '.env') {
            await (await Message.create({
              header: f.name,
              message: `The .env file is present, function configuration will use the values specified in the file.`,
              kind: MessageKind.info,
            })).write(input.io);
            flexd.configuration = parseKeyValue(content) || {};
            flexd.metadata = flexd.metadata || {};
            flexd.metadata.applicationSettings = content;
            continue;
          }
          flexd.nodejs.files[f.name] = content;
        }

        if (!flexd.nodejs.files['index.js']) {
          throw new Error('The function must include the index.js file. Make sure it exists in the source directory.');
        }

        await input.io.writeLine(Text.create([Text.eol(), Text.eol(), Text.bold('Ready to deploy the function:')]));

        const table = await Table.create({
          width: input.io.outputWidth,
          count: 2,
          gutter: Text.dim('  │  '),
          columns: [{ flexShrink: 0, flexGrow: 0 }, { flexGrow: 1 }],
        });

        table.addRow(['Account', Text.bold(profile.account || '')]);
        table.addRow(['Subscription', Text.bold(profile.subscription || '')]);
        table.addRow(['Boundary', Text.bold(`${profile.boundary}`)]);
        table.addRow(['Function', Text.bold(`${profile.function}`)]);
        table.addRow([
          'Files',
          Text.bold(
            Object.keys(flexd.nodejs.files)
              .sort()
              .join(', ')
          ),
        ]);
        if (flexd.configuration && Object.keys(flexd.configuration).length > 0) {
          table.addRow([
            'Configuration',
            Object.keys(flexd.configuration)
              .sort()
              .join(', '),
          ]);
        } else {
          table.addRow(['Configuration', 'Not specified']);
        }
        if (flexd.schedule && flexd.schedule.cron) {
          table.addRow(['Schedule', `${flexd.schedule.cron}, timezone: ${flexd.schedule.timezone || 'UTC'}`]);
        } else {
          table.addRow(['Schedule', 'Not specified']);
        }
        await input.io.write(table.toString());

        await input.io.writeLine();
        await input.io.writeLine();
        if (!input.options.confirm && !(await input.io.prompt({ prompt: 'Deploy?', yesNo: true }))) {
          return 0;
        }

        // Deploy

        let response: IHttpResponse;
        try {
          response = await request({
            method: 'PUT',
            url: `${profile.baseUrl}/v1/account/${profile.account}/subscription/${profile.subscription}/boundary/${
              profile.boundary
            }/function/${profile.function}`,
            headers: {
              Authorization: `Bearer ${profile.accessToken}`,
              'User-Agent': `fusebit-cli/${require('../../package.json').version}`,
            },
            data: flexd,
            validStatus: status => status === 200 || status === 201 || status === 204 || status === 400,
          });
          while (response.status === 201) {
            await sleep(2000);
            response = await request({
              url: `${profile.baseUrl}/v1/account/${profile.account}/subscription/${profile.subscription}/boundary/${
                profile.boundary
              }/function/${profile.function}/build/${response.data.id}`,
              headers: {
                Authorization: `Bearer ${profile.accessToken}`,
                'User-Agent': `fusebit-cli/${require('../../package.json').version}`,
              },
              validStatus: status => status === 200 || status === 201 || status === 204 || status === 410,
            });
          }
        } catch (e) {
          if (e.response) {
            response = e.response;
            if (typeof response.data === 'string') {
              try {
                // best effort
                response.data = JSON.parse(response.data);
              } catch (_) {}
            }
          } else {
            // input.io.spin(false);
            throw e;
          }
        }
        // input.io.spin(false);
        if ((response.status === 200 && response.data.status === 'success') || response.status === 204) {
          if (response.status === 204) {
            await (await Message.create({
              header: 'No changes',
              message: `Function has not changed since previous deployment.`,
              kind: MessageKind.warning,
            })).write(input.io);
          } else {
            await (await Message.create({
              header: 'Location',
              message: response.data.location,
              kind: MessageKind.info,
            })).write(input.io);
            flexd.location = response.data.location;
          }
          flexd.subscriptionId = profile.subscription;
          flexd.boundaryId = profile.boundary;
          flexd.id = profile.function;
          flexd.flxVersion = require('../../../package.json').version;
          if (flexd.metadata) {
            delete flexd.metadata.applicationSettings;
          }
          delete flexd.configuration;
          delete flexd.nodejs;
          Fs.mkdirSync(Path.join(sourceDirectory, '.flexd'), { recursive: true });
          Fs.writeFileSync(
            Path.join(sourceDirectory, '.flexd', 'function.json'),
            JSON.stringify(flexd, null, 2),
            'utf8'
          );
          return 0;
        } else {
          throw new Error(
            `Error deploying function. HTTP status ${response.status}. Details: ${(response.data &&
              (response.data.error || response.data.message || response.data)) ||
              'Unknown error.'}`
          );
        }
      }
    );

    return 0;
  }
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
