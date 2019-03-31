import { EOL } from 'os';
import { Command, ArgType, IExecuteInput } from '@5qtrs/cli';
import { request, IHttpResponse } from '@5qtrs/request';
import { ProfileService, serializeKeyValue, parseKeyValue } from '../../services';
import * as Path from 'path';
import * as Fs from 'fs';

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
          description:
            'The cron schedule to use to invoke the function. Construct a CRON string at https://crontab.guru/.',
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
    let profileService = await ProfileService.create(input);
    let profile = await profileService.getExecutionProfile([]);
    if (!profile) {
      return 1;
    }

    let sourceDirectory = Path.join(process.cwd(), (input.arguments[0] as string) || '');
    let flexd: any;
    try {
      flexd = require(Path.join(sourceDirectory, '.flexd.json'));
    } catch (_) {
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

    profile.subscription = input.options.subscription || flexd.subscriptionId || profile.subscription;
    profile.boundary = input.options.boundary || flexd.boundaryId || profile.boundary;
    profile.function = input.options.function || flexd.id || profile.function;

    ['subscription', 'boundary', 'function'].forEach(x => {
      // @ts-ignore
      if (!profile[x]) {
        throw new Error(
          `The ${x} id must be specified. You can specify usin the --${x} option, or by using a profile which defines this value.`
        );
      }
    });

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
      flexd.schedule = flexd.schedule || {};
      flexd.schedule.cron = input.options.cron;
      if (input.options.timezone) {
        flexd.schedule.timezone = input.options.timezone;
        flexd.metadata = flexd.metadata || {};
        flexd.metadata.cronSettings = serializeKeyValue(flexd.schedule);
      }
    } else if (input.options.timezone) {
      throw new Error('If you specify --timezone, you must also specify --cron.');
    }

    let files = Fs.readdirSync(sourceDirectory, { withFileTypes: true });
    files.forEach(f => {
      if (!f.isFile()) {
        console.log(`Ignoring ${f.name}`);
        return;
      }
      if (f.name === '.flexd.json') {
        console.log(`The .flexd.json is present, defaults specified in this file are used.`);
        return;
      }
      let content = Fs.readFileSync(Path.join(sourceDirectory, f.name), 'utf8');
      if (f.name === '.env') {
        console.log(`The .env file is present, function configuration will use the values specified in the file.`);
        flexd.configuration = parseKeyValue(content) || {};
        flexd.metadata = flexd.metadata || {};
        flexd.metadata.applicationSettings = content;
        return;
      }
      console.log(`Adding ${f.name} file`);
      flexd.nodejs.files[f.name] = content;
    });

    if (!flexd.nodejs.files['index.js']) {
      throw new Error('The function must include the index.js file. Make sure it exists in the source directory.');
    }

    console.log();
    console.log('Ready to deploy the function:');
    console.log(`Subscription: ${profile.subscription}`);
    console.log(`Name: ${profile.boundary}/${profile.function}`);
    console.log(
      `Files: ${Object.keys(flexd.nodejs.files)
        .sort()
        .join(', ')}`
    );
    if (flexd.configuration && Object.keys(flexd.configuration).length > 0) {
      console.log(
        `Configuration: ${Object.keys(flexd.configuration)
          .sort()
          .join(', ')}`
      );
    } else {
      console.log('Configuration: not specified');
    }
    if (flexd.schedule && flexd.schedule.cron) {
      console.log(`CRON: ${flexd.schedule.cron}, timezone: ${flexd.schedule.timezone || 'UTC'}`);
    } else {
      console.log('CRON: not specified');
    }

    if (!input.options.confirm && !(await input.io.prompt({ prompt: 'Deploy?', yesNo: true }))) {
      return 0;
    }

    // Deploy

    console.log('Deploying...');
    input.io.spin(true);
    let response: IHttpResponse;
    try {
      response = await request({
        method: 'PUT',
        url: `${profile.baseUrl}/v1/subscription/${profile.subscription}/boundary/${profile.boundary}/function/${
          profile.function
        }`,
        headers: {
          Authorization: `Bearer ${profile.token}`,
        },
        data: flexd,
        validStatus: status => status === 200 || status === 201 || status === 204 || status === 400,
      });
      while (response.status === 201) {
        await sleep(2000);
        response = await request({
          url: `${profile.baseUrl}/v1/subscription/${profile.subscription}/boundary/${profile.boundary}/function/${
            profile.function
          }/build/${response.data.id}`,
          headers: {
            Authorization: `Bearer ${profile.token}`,
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
        input.io.spin(false);
        throw e;
      }
    }
    input.io.spin(false);
    if ((response.status === 200 && response.data.status === 'success') || response.status === 204) {
      if (response.status === 204) {
        console.log('Function has not changed since previous deployment.');
      } else {
        console.log('Success. Function location:');
        console.log(response.data.location);
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
      Fs.writeFileSync(Path.join(sourceDirectory, '.flexd.json'), JSON.stringify(flexd, null, 2), 'utf8');
      console.log('NOTE: all options were saved to .flexd.json. Next time you can run just `flx function deploy`.');
      return 0;
    } else {
      console.log('Error deploying function.');
      console.log(`Status: ${response.status}`);
      console.log(
        `Details: ${(response.data && (response.data.error || response.data.message || response.data)) ||
          'Unknown error.'}`
      );
      return 1;
    }
  }
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
