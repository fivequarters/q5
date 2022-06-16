import { join } from 'path';
import { createServer } from 'http';
import open from 'open';
import { EventStream, IEventMessage, IEventStreamOptions } from '@5qtrs/event-stream';
import { readFile, readDirectory, exists, copyDirectory, writeFile } from '@5qtrs/file';
import { IFusebitExecutionProfile } from '@5qtrs/fusebit-profile-sdk';
import { Message, IExecuteInput, Confirm } from '@5qtrs/cli';
import { Text, IText } from '@5qtrs/text';
import { ExecuteService } from './ExecuteService';
import { ProfileService } from './ProfileService';
import { VersionService } from './VersionService';
import { request } from '@5qtrs/request';
import DotEnv from 'dotenv';
import { spawn } from 'child_process';

import { startTunnel, startHttpServer } from './TunnelService';

import readline from 'readline';

function askQuestion(query: string) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) =>
    rl.question(query, (ans) => {
      rl.close();
      resolve(ans);
    })
  );
}

// ------------------
// Internal Constants
// ------------------

const envFileName = '.env';
const cronOffRegex = /^off$/i;
const fromFusebitJson = Text.dim(' (from fusebit.json)');
const notSet = Text.dim(Text.italic('<not set>'));
const hiddenValue = '****';
const editorIp = process.env.FUSEBIT_EDITOR_IP || '127.0.0.1';
const maxHttpMethodLen = 7;

// ------------------
// Internal Functions
// ------------------

function getTemplateDirectoryPath(): string {
  return join(__dirname, '../../template');
}

async function getTemplateFiles(): Promise<string[]> {
  return readDirectory(getTemplateDirectoryPath(), { joinPaths: false, filesOnly: true, ignore: ['node_modules'] });
}

async function getTemplateOverWriteFiles(path: string): Promise<string[]> {
  const templateFiles = await getTemplateFiles();
  const overwriteFiles = [];
  for (const templateFile of templateFiles) {
    const fullPath = join(path, templateFile);
    if (await exists(fullPath)) {
      overwriteFiles.push(templateFile);
    }
  }
  return overwriteFiles;
}

async function getSaveOverWriteFiles(path: string, functionSpec: any): Promise<string[]> {
  const functionFiles = [
    ...(functionSpec && functionSpec.nodejs && functionSpec.nodejs.files ? Object.keys(functionSpec.nodejs.files) : []),
    ...(functionSpec && functionSpec.nodejs && functionSpec.nodejs.encodedFiles
      ? Object.keys(functionSpec.nodejs.encodedFiles)
      : []),
  ];

  if (functionSpec.configuration && Object.keys(functionSpec.configuration).length > 0) {
    functionFiles.push(envFileName);
  } else if (functionSpec.metadata && functionSpec.metadata.fusebit && functionSpec.metadata.fusebit.appSettings) {
    functionFiles.push(envFileName);
  }

  const existingFiles = await readDirectory(path, {
    recursive: false,
    filesOnly: true,
    joinPaths: false,
    ignore: ['node_modules'],
  });

  const overwriteFiles = [];
  for (const file of functionFiles) {
    if (existingFiles.indexOf(file) >= 0) {
      overwriteFiles.push(file);
    }
  }

  return overwriteFiles;
}

// -------------------
// Exported Interfaces
// -------------------

export interface IFusebitFunctionShort {
  functionId: string;
  boundaryId: string;
}

export interface IFusebitFunctionListOptions {
  cron?: boolean;
  next?: string;
  count?: number;
  search?: string[];
}

export interface IFusebitFunctionListResult {
  items: IFusebitFunctionShort[];
  next?: string;
}

// ----------------
// Exported Classes
// ----------------

export class FunctionService {
  private input: IExecuteInput;
  private executeService: ExecuteService;
  private profileService: ProfileService;

  private constructor(profileService: ProfileService, executeService: ExecuteService, input: IExecuteInput) {
    this.input = input;
    this.profileService = profileService;
    this.executeService = executeService;
  }

  public static async create(input: IExecuteInput) {
    const executeService = await ExecuteService.create(input);
    const profileService = await ProfileService.create(input);
    return new FunctionService(profileService, executeService, input);
  }

  public async getFunctionExecutionProfile(functionRequired: boolean, functionId?: string, fusebitJsonPath?: string) {
    const expected = ['account', 'subscription', 'boundary'];
    if (functionRequired) {
      expected.push('function');
    }
    return this.profileService.getExecutionProfile(expected, { function: functionId });
  }

  public async execute<T>(func: () => Promise<T>) {
    try {
      const result = await func();
      return result;
    } catch (error) {
      await this.executeService.error('Profile Error', error.message, error);
    }
  }

  public async getFunctionSpecFromGithubTemplate(githubPath: string): Promise<any> {
    return await this.executeService.execute(
      {
        header: 'Get Template',
        message: Text.create("Getting function template '", Text.bold(`${githubPath}`), "' from Github..."),
        errorHeader: 'Get Template Error',
        errorMessage: Text.create("Unable to get function template '", Text.bold(`${githubPath}`)),
      },
      async () => {
        const [org, repo, directory] = githubPath.split('/');
        if (!org || !repo) {
          throw new Error('The Github path of the function template must be in the format {org}/{repo}[/{directory}]');
        }
        const contentResponse = await request({
          method: 'GET',
          url: `https://api.github.com/repos/${org}/${repo}/contents${directory ? '/' + directory : ''}`,
          headers: { Accept: 'application/vnd.github.v3+json' },
        });
        if (contentResponse.status !== 200) {
          throw new Error(
            `Unable to obtain function template from Github. HTTP status code: ${contentResponse.status}.`
          );
        }
        let templateFiles: any = {};
        for (const entry of contentResponse.data) {
          if (entry.type === 'file' && entry.name !== '.gitignore') {
            const fileResponse = await request(entry.download_url);
            if (fileResponse.status !== 200) {
              throw new Error(
                `Unable to obtain function template from Github. HTTP status code: ${fileResponse.status}.`
              );
            }
            templateFiles[entry.name] = fileResponse.data;
          }
        }
        if (!templateFiles['index.js']) {
          const fileNames = Object.keys(templateFiles).sort();
          throw new Error(
            `The template does not specify the required 'index.js' file. Files found in the template: ${
              fileNames.length > 0 ? fileNames.join(', ') : 'none'
            }.`
          );
        }
        let fusebitJson: any = templateFiles['fusebit.json'] || {};
        delete templateFiles['fusebit.json'];
        let envFile = templateFiles[envFileName];
        delete templateFiles[envFileName];
        if (typeof fusebitJson !== 'object') {
          throw new Error(`The 'fusebit.json' file in the template is not a JSON object.`);
        }
        fusebitJson.nodejs = { files: {}, encodedFiles: {} };
        for (const fileName in templateFiles) {
          fusebitJson.nodejs.files[fileName] = templateFiles[fileName];
        }
        return Object.assign(
          {},
          { nodejs: fusebitJson.nodejs },
          fusebitJson.metadata && { metadata: fusebitJson.metadata },
          fusebitJson.compute && { compute: fusebitJson.compute },
          fusebitJson.computeSerialized && { computeSerialized: fusebitJson.computeSerialized },
          fusebitJson.schedule && { schedule: fusebitJson.schedule },
          fusebitJson.scheduleSerialized && { scheduleSerialized: fusebitJson.scheduleSerialized },
          fusebitJson.configuration && !envFile && { configuration: fusebitJson.configuration },
          fusebitJson.configurationSerialized &&
            !envFile && { configurationSerialized: fusebitJson.configurationSerialized },
          envFile && { configurationSerialized: envFile }
        );
      }
    );
  }

  public async getFunctionSpec(path: string, cron?: string, timezone?: string): Promise<any> {
    const functionSpec: any = { nodejs: { files: {}, encodedFiles: {} } };
    const fusebitJson = (await this.getFusebitJson(path)) || {};

    functionSpec.metadata = fusebitJson.metadata;

    functionSpec.compute = fusebitJson.compute || fusebitJson.lambda;
    functionSpec.computeSerialized = fusebitJson.computeSerialized;

    functionSpec.security = fusebitJson.security;
    functionSpec.fusebitEditor = fusebitJson.fusebitEditor;

    functionSpec.routes = fusebitJson.routes;

    // schedule and scheduleSerialized
    const cronDisabled = cronOffRegex.test(cron || '');
    if (cronDisabled) {
      functionSpec.schedule = {};
    } else {
      if (cron) {
        functionSpec.schedule = { cron };
        functionSpec.schedule.timezone = timezone;
      } else if (timezone) {
        await this.executeService.error(
          'Invalid Option',
          Text.create(
            "The '",
            Text.bold('--timezone'),
            "' options can only be set for functions with with cron enabled."
          )
        );
      } else {
        functionSpec.schedule = fusebitJson.schedule;
      }
    }
    functionSpec.scheduleSerialized = fusebitJson.scheduleSerialized;

    // nodejs files & configuration & configurationSerialized
    const files = await readDirectory(path, {
      filesOnly: true,
      joinPaths: false,
      recursive: true,
      ignore: ['node_modules', '.git', '.gitignore'].concat((this.input.options.ignore as string[]) || []),
    });
    for (const file of files) {
      if (file !== 'fusebit.json') {
        const content = await readFile(join(path, file));
        if (content) {
          if (file === envFileName) {
            functionSpec.configurationSerialized = content.toString('utf8');
          } else {
            if (content.includes('\u0000')) {
              // Encode files with a null in them as base64
              functionSpec.nodejs.encodedFiles[file] = {
                data: content.toString('base64'),
                encoding: 'base64',
              };
            } else {
              functionSpec.nodejs.files[file] = content.toString('utf8');
            }
          }
        }
      }
    }

    if (!functionSpec.nodejs.files['index.js'] && !functionSpec.nodejs.encodedFiles['index.js']) {
      await this.executeService.error(
        'Invalid Function',
        Text.create(
          "The function must include an '",
          Text.bold('index.js'),
          "' file. Make sure it exists in the source directory."
        )
      );
    }

    if (functionSpec.metadata && functionSpec.metadata.fusebit) {
      if (!functionSpec.computeSerialized) {
        functionSpec.computeSerialized = functionSpec.metadata.fusebit.computeSettings;
      }
      delete functionSpec.metadata.fusebit.computeSettings;

      if (!functionSpec.scheduleSerialized) {
        functionSpec.scheduleSerialized = functionSpec.metadata.fusebit.cronSettings;
      }

      delete functionSpec.metadata.fusebit.cronSettings;
      delete functionSpec.metadata.fusebit.applicationSettings;
    }

    return functionSpec;
  }

  public async getFusebitJson(path?: string): Promise<any> {
    try {
      const buffer = await readFile(join(path || process.cwd(), 'fusebit.json'));
      return JSON.parse(buffer.toString());
    } catch (error) {
      // do nothing
    }
  }

  public async setFusebitJson(path: string, functionSpec: any): Promise<void> {
    const fusebitJson = (await this.getFusebitJson(path)) || {};

    fusebitJson.fuseVersion = VersionService.getVersion();
    fusebitJson.metadata = functionSpec.metadata;
    fusebitJson.location = functionSpec.location;
    fusebitJson.compute = functionSpec.compute;
    fusebitJson.computeSerialized = functionSpec.computeSerialized;
    fusebitJson.schedule = functionSpec.schedule;
    fusebitJson.scheduleSerialized = functionSpec.scheduleSerialized;
    fusebitJson.security = functionSpec.security;
    fusebitJson.fusebitEditor = functionSpec.fusebitEditor;
    fusebitJson.routes = functionSpec.routes;

    try {
      await writeFile(join(path, 'fusebit.json'), JSON.stringify(fusebitJson, null, 2));
    } catch (error) {
      await this.executeService.error(
        'Write Error',
        Text.create("Unable to save the fusebit.json file in the '", Text.bold(path), "' directory")
      );
    }
  }

  public async setFunctionFiles(path: string, functionSpec: any): Promise<string[]> {
    const files: string[] = [];

    if (functionSpec) {
      if (functionSpec.nodejs) {
        const filesToWrite = functionSpec.nodejs.files || {};
        for (const file of Object.keys(filesToWrite)) {
          let content = filesToWrite[file];

          if (typeof content !== 'string') {
            content = JSON.stringify(content, null, 2);
          }

          await writeFile(join(path, file), content);

          files.push(file);
        }

        const encodedFilesToWrite = functionSpec.nodejs.encodedFiles || {};
        for (const file of Object.keys(encodedFilesToWrite)) {
          let content = encodedFilesToWrite[file];

          // Decode the contents of the buffer.
          content = Buffer.from(content.data, content.encoding);
          await writeFile(join(path, file), content);

          files.push(file);
        }
      }

      if (functionSpec.configurationSerialized) {
        await writeFile(join(path, envFileName), functionSpec.configurationSerialized);
        files.push(envFileName);
      }
    }

    return files;
  }

  public async startEditServer(functionId?: string, theme: string = 'light', functionSpec?: any) {
    const profile = await this.getFunctionExecutionProfile(true, functionId, process.cwd());

    if (theme !== 'light' && theme !== 'dark') {
      await this.executeService.error('Edit Function Error', Text.create('Unsupported value of the theme parameter'));
    }

    const editorHtml = this.getEditorHtml(profile, theme, functionSpec);
    const startServer = (port: number) => {
      return new Promise<void>((resolve, reject) => {
        createServer((req, res) => {
          if (req.method === 'GET') {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            return res.end(editorHtml);
          } else {
            res.writeHead(404);
            return res.end();
          }
        })
          .on('error', reject)
          .listen(port, resolve);
      });
    };

    let attempts = 0;
    const startServerWithRetry = async () => {
      try {
        attempts++;
        const port = 8000 + Math.floor(Math.random() * 100);
        await startServer(port);
        open(`http://${editorIp}:${port}`);
        return port;
      } catch (error) {
        if (attempts >= 10) {
          return undefined;
        }
        await startServerWithRetry();
      }
    };

    const port = await startServerWithRetry();

    if (!port) {
      await this.executeService.error(
        'Edit Function Error',
        'Unable to find a free port in the 80xx range to host a local service. Please try again.'
      );
    }

    await this.executeService.result(
      'Edit Function',
      Text.create(
        "Editing the '",
        Text.bold(`${profile.function}`),
        "' function in boundary '",
        Text.bold(`${profile.boundary}`),
        "'.",
        Text.eol(),
        Text.eol(),
        'Hosting the Fusebit editor at ',
        Text.bold(`http://${editorIp}:${port}`),
        Text.eol(),
        'If the browser does not open automatically, navigate to this URL.',
        Text.eol(),
        Text.eol(),
        'Ctrl-C to terminate...'
      )
    );

    await new Promise(() => {});
  }

  public async tryGetFunction(functionId: string): Promise<any> {
    const profile = await this.getFunctionExecutionProfile(true, functionId);

    const result = await this.executeService.execute(
      {
        header: 'Check Function',
        message: Text.create(
          "Checking if function '",
          Text.bold(`${profile.function}`),
          "' in boundary '",
          Text.bold(`${profile.boundary}`),
          "' exists..."
        ),
        errorHeader: 'Check Function Error',
        errorMessage: Text.create(
          "Unable to check if function '",
          Text.bold(`${profile.function}`),
          "' in boundary '",
          Text.bold(`${profile.boundary}`),
          "' exists"
        ),
      },
      async () => {
        const headers = { Authorization: `bearer ${profile.accessToken}` };
        ExecuteService.addCommonHeaders(headers);
        const response: any = request({
          method: 'GET',
          url: [
            `${profile.baseUrl}/v1/account/${profile.account}/subscription/`,
            `${profile.subscription}/boundary/${profile.boundary}/function/${profile.function}?include=all`,
          ].join(''),
          headers,
        });
        if (response.status === 403) {
          const message = 'Access was not authorized; contact an account admin to request access';
          throw new Error(message);
        }
        if (response.status >= 500) {
          const message = 'An unknown error occurred on the server';
          throw new Error(message);
        }
        if (response.status >= 400) {
          throw new Error(response.data.message);
        }
        return response;
      }
    );

    return result;
  }

  public async getFunction(path?: string, functionId?: string): Promise<void> {
    const profile = await this.getFunctionExecutionProfile(true, functionId, path);

    const result = await this.executeService.executeRequest(
      {
        header: 'Get Function',
        message: Text.create(
          "Getting function '",
          Text.bold(`${profile.function}`),
          "' in boundary '",
          Text.bold(`${profile.boundary}`),
          "'..."
        ),
        errorHeader: 'Get Function Error',
        errorMessage: Text.create(
          "Unable to get function '",
          Text.bold(`${profile.function}`),
          "' in boundary '",
          Text.bold(`${profile.boundary}`),
          "'"
        ),
      },
      {
        method: 'GET',
        url: [
          `${profile.baseUrl}/v1/account/${profile.account}/subscription/`,
          `${profile.subscription}/boundary/${profile.boundary}/function/${profile.function}?include=all`,
        ].join(''),
        headers: { Authorization: `bearer ${profile.accessToken}` },
      }
    );

    result.accountId = profile.account;

    return result;
  }

  public async getFunctionLogs(path?: string, functionId?: string): Promise<void> {
    const profile = await this.getFunctionExecutionProfile(false, functionId, path);

    if (!profile.boundary) {
      throw new Error('A boundary must be specified.');
    }

    return this.getFunctionLogsByProfile(profile);
  }

  public async getFunctionLogsByProfile(
    profile: IFusebitExecutionProfile,
    entityType: string = 'function',
    entityTypeName: string = 'Function',
    withBoundary: boolean = true
  ): Promise<void> {
    const isJson = this.input.options.output === 'json';

    const baseUrl = `${profile.baseUrl}/v1/account/${profile.account}/subscription/${profile.subscription}`;
    const url = profile.function
      ? `${baseUrl}/boundary/${profile.boundary}/function/${profile.function}/log?token=${profile.accessToken}`
      : `${baseUrl}/boundary/${profile.boundary}/log?token=${profile.accessToken}`;
    const functionMessage = [
      ...(profile.function ? [`of ${entityType} '`, Text.bold(profile.function || ''), "'"] : ['']),
      ...(profile.function && withBoundary ? [' '] : ['']),
      ...(withBoundary ? ["in boundary '", Text.bold(profile.boundary || ''), "'"] : ['']),
    ];

    await this.executeService.execute(
      {
        header: `Get ${entityTypeName} Logs`,
        message: Text.create('Connecting to logs ', ...functionMessage, '...'),
        errorHeader: `Get ${entityTypeName} Logs Error`,
        errorMessage: Text.create('Unable to connect to logs ', ...functionMessage),
      },
      async () => {
        const headers = {};
        ExecuteService.addCommonHeaders(headers);
        return new Promise(async (resolve, reject) => {
          let ready = false;
          const options = {
            headers,
            onEnd: resolve,
            onError: reject,
            onMessage: async (message: IEventMessage) => {
              if (message.name === 'log' && ready) {
                if (isJson) {
                  this.input.io.writeLineRaw(message.data);
                } else {
                  let parsed: any;
                  try {
                    parsed = JSON.parse(message.data);
                  } catch (error) {
                    await this.executeService.error(
                      `${entityTypeName} Log Error`,
                      `There was an error parsing the ${entityType} logs`,
                      error
                    );
                  }
                  this.input.io.write(
                    Text.dim(
                      `[${new Date(parsed.time).toLocaleTimeString()}] ${(parsed.method || '').padStart(
                        maxHttpMethodLen
                      )}> `
                    )
                  );
                  this.input.io.writeLineRaw(parsed.level > 30 ? Text.red(parsed.msg).toString() : parsed.msg);
                  if (parsed.properties) {
                    const trace = parsed.properties.trace || parsed.properties.stackTrace;
                    if (trace && Array.isArray(trace)) {
                      trace.forEach((line) => {
                        this.input.io.writeLineRaw(parsed.level > 30 ? Text.red(line).toString() : line);
                      });
                    }
                  }
                }
              }
            },
          };

          // @ts-ignore
          await EventStream.create(url, options);

          await this.executeService.info(
            'Connected',
            Text.create('Successfully connected to real-time streaming logs...')
          );
          ready = true;
        });
      }
    );

    await this.executeService.newLine();
    await this.executeService.warning(
      'Logs Disconnected',
      Text.create('The connection to logs ', ...functionMessage, ' was terminated')
    );
  }

  public async listFunctions(options: IFusebitFunctionListOptions): Promise<IFusebitFunctionListResult> {
    const profile = await this.profileService.getExecutionProfile(['subscription']);
    let cronMessage = '';

    const query = [];
    if (options.cron !== undefined) {
      cronMessage = options.cron ? 'CRON ' : 'non-CRON ';
      query.push(`cron=${options.cron}`);
    }
    if (options.count) {
      query.push(`count=${options.count}`);
    }
    if (options.search) {
      options.search.forEach((q: string) => query.push(`search=${q}`));
    }
    if (options.next) {
      query.push(`next=${options.next}`);
    }

    const queryString = `?${query.join('&')}`;
    const boundaryUrl = profile.boundary ? `/boundary/${profile.boundary}/function` : '/function';

    const result = await this.executeService.executeRequest(
      {
        header: 'List Functions',
        message: Text.create(
          'Listing ',
          Text.bold(cronMessage),
          'functions',
          profile.boundary ? " in boundary '" + Text.bold(profile.boundary) + "'" : '',
          '...'
        ),
        errorHeader: 'List Functions Error',
        errorMessage: Text.create(
          'Unable to list ',
          Text.bold(cronMessage),
          'functions',
          profile.boundary ? " in boundary '" + Text.bold(profile.boundary) + "'" : ''
        ),
      },
      {
        method: 'GET',
        url: `${profile.baseUrl}/v1/account/${profile.account}/subscription/${profile.subscription}${boundaryUrl}${queryString}`,
        headers: { Authorization: `bearer ${profile.accessToken}` },
      }
    );

    return result;
  }

  public async removeFunction(functionId: string): Promise<void> {
    const profile = await this.getFunctionExecutionProfile(true, functionId, process.cwd());

    await this.executeService.executeRequest(
      {
        header: 'Remove Function',
        message: Text.create(
          "Removing function '",
          Text.bold(`${profile.function}`),
          "' in boundary '",
          Text.bold(`${profile.boundary}`),
          "'..."
        ),
        errorHeader: 'Remove Function Error',
        errorMessage: Text.create(
          "Unable to remove function '",
          Text.bold(`${profile.function}`),
          "' in boundary '",
          Text.bold(`${profile.boundary}`),
          "'"
        ),
      },
      {
        method: 'DELETE',
        url: [
          `${profile.baseUrl}/v1/account/${profile.account}/subscription/`,
          `${profile.subscription}/boundary/${profile.boundary}/function/${profile.function}`,
        ].join(''),
        headers: { Authorization: `bearer ${profile.accessToken}` },
      }
    );

    await this.executeService.result(
      'Function Removed',
      Text.create(
        "Function '",
        Text.bold(`${profile.function}`),
        "' in boundary '",
        Text.bold(`${profile.boundary}`),
        "' was successfully removed"
      )
    );
  }

  public async getFunctionUrl(functionId?: string, quiet: boolean = false): Promise<string> {
    const profile = await this.getFunctionExecutionProfile(true, functionId, process.cwd());

    const data = await this.executeService.executeRequest(
      quiet
        ? {}
        : {
            header: 'Get Function Url',
            message: Text.create(
              "Getting the function execution URL for function '",
              Text.bold(`${profile.function}`),
              "' in boundary '",
              Text.bold(`${profile.boundary}`),
              "'..."
            ),
            errorHeader: 'Get Function Url Error',
            errorMessage: Text.create(
              "Unable to get the function execution URL for function '",
              Text.bold(`${profile.function}`),
              "' in boundary '",
              Text.bold(`${profile.boundary}`),
              "'"
            ),
          },
      {
        method: 'GET',
        url: [
          `${profile.baseUrl}/v1/account/${profile.account}/subscription/`,
          `${profile.subscription}/boundary/${profile.boundary}/function/${profile.function}/location`,
        ].join(''),
        headers: { Authorization: `bearer ${profile.accessToken}` },
      }
    );

    return data.location as string;
  }

  public async initFunction(path: string): Promise<void> {
    const files = await getTemplateFiles();
    try {
      await copyDirectory(getTemplateDirectoryPath(), path);
    } catch (error) {
      await this.executeService.error('Init Function Error', 'Failed to initialize the function', error);
    }

    const output = this.input.options.output as string;
    if (output === 'json') {
      await this.input.io.writeLineRaw(JSON.stringify({ path, files }, null, 2));
      return;
    }

    await this.executeService.result(
      'Function Initialized',
      Text.create(
        "A new function was initialized in the '",
        Text.bold(path),
        "' directory. The following files were generated:",
        Text.eol(),
        Text.eol(),
        Text.create(files.map((file) => Text.create(Text.dim('• '), file, Text.eol()))),
        Text.eol(),
        "You can deploy the function with the '",
        Text.bold('function deploy'),
        "' command."
      )
    );
  }

  public async serveFunction(path: string, functionId: string): Promise<void> {
    const profile = await this.getFunctionExecutionProfile(true, functionId, process.cwd());
    const cleanup = async () => {
      const result = await this.executeService.executeRequest(
        {
          header: 'Release',
          message: Text.create(
            "Releasing traffic for '",
            Text.bold(`${profile.function}`),
            "' in boundary '",
            Text.bold(`${profile.boundary}`),
            "'..."
          ),
          errorHeader: 'Release Function Error',
          errorMessage: Text.create(
            "Unable to release function '",
            Text.bold(`${profile.function}`),
            "' in boundary '",
            Text.bold(`${profile.boundary}`),
            "'"
          ),
        },
        {
          method: 'DELETE',
          url: `${profile.baseUrl}/v1/account/${profile.account}/subscription/${profile.subscription}/boundary/${profile.boundary}/function/${profile.function}/redirect`,
          headers: {
            Authorization: `Bearer ${profile.accessToken}`,
          },
        }
      );
    };

    await this.executeService.info('Starting Service', 'Starting the local server.');

    DotEnv.config({ path: join(path, '.env') });
    const port = await startHttpServer(
      async (body: any): Promise<any> => {
        try {
          console.log(`> ${body.method} ${body.url}`);
          body.configuration = process.env;
          const result: any = await new Promise((resolve, reject) => {
            try {
              const worker = spawn(
                process.argv[0], // node
                [join(__dirname, 'cgi.js')],
                {
                  windowsHide: true,
                  stdio: [
                    'pipe', // stdin
                    'inherit', // stdout
                    'inherit', // stderr
                    'ipc', // cgi result
                  ],
                }
              );
              worker.stdin?.end(JSON.stringify({ path, body }));
              let finished = false;
              worker.once('message', (m) => {
                if (!finished) {
                  finished = true;
                  resolve(m);
                }
              });
              worker.once('close', (code, signal) => {
                if (!finished) {
                  finished = true;
                  reject(new Error(`Error processing request: code ${code} and signal ${signal}`));
                }
              });
            } catch (e) {
              return reject(e);
            }
          });
          if (result.ok) {
            console.log(`< ${JSON.stringify(result.body)}`);
            return result.body;
          }
          console.log(`E: `, result.error);
          return { status: 501, body: result.error };
        } catch (e) {
          console.log(`E: `, e);
          return { status: 501, body: `${e}` };
        }
      }
    );

    await this.executeService.info('Building Tunnel', `Establishing tunnel to Fusebit (port ${port})`);
    const { tunnel } = await startTunnel(port);
    try {
      await this.executeService.info('Redirecting', `Redirecting traffic for ${profile.boundary}/${functionId}`);
      const result = await this.executeService.executeRequest(
        {
          header: 'Redirect',
          message: Text.create(
            "Redirecting traffic for '",
            Text.bold(`${profile.function}`),
            "' in boundary '",
            Text.bold(`${profile.boundary}`),
            "'..."
          ),
          errorHeader: 'Redirect Function Error',
          errorMessage: Text.create(
            "Unable to redirect function '",
            Text.bold(`${profile.function}`),
            "' in boundary '",
            Text.bold(`${profile.boundary}`),
            "'"
          ),
        },
        {
          method: 'POST',
          url: `${profile.baseUrl}/v1/account/${profile.account}/subscription/${profile.subscription}/boundary/${profile.boundary}/function/${profile.function}/redirect`,
          headers: {
            Authorization: `Bearer ${profile.accessToken}`,
          },
          data: { redirectUrl: tunnel.url },
        }
      );

      await this.executeService.info('Serving', 'Ready to serve requests. Press Ctrl-C to quit.');

      process.on('SIGINT', async () => {
        await cleanup();
        process.exit();
      });
      await new Promise(() => {});
    } finally {
      await cleanup();
    }
  }

  public async deployFunction(path: string | undefined, functionId: string, functionSpec?: any): Promise<string> {
    const profile = await this.getFunctionExecutionProfile(true, functionId, path);

    return this.deployFunctionEx(profile, functionSpec);
  }

  public async deployFunctionEx(
    profile: {
      baseUrl: string;
      account: string;
      subscription?: string;
      function?: string;
      boundary?: string;
      accessToken: string;
    },
    functionSpec?: string
  ) {
    let result = await this.executeService.executeRequest(
      {
        header: 'Deploy Function',
        message: Text.create(
          "Deploying function '",
          Text.bold(`${profile.function}`),
          "' in boundary '",
          Text.bold(`${profile.boundary}`),
          "'..."
        ),
        errorHeader: 'Deploy Function Error',
        errorMessage: Text.create(
          "Unable to deploy function '",
          Text.bold(`${profile.function}`),
          "' in boundary '",
          Text.bold(`${profile.boundary}`),
          "'"
        ),
      },
      {
        method: functionSpec ? 'PUT' : 'POST',
        url: functionSpec
          ? `${profile.baseUrl}/v1/account/${profile.account}/subscription/${profile.subscription}/boundary/${profile.boundary}/function/${profile.function}`
          : `${profile.baseUrl}/v1/account/${profile.account}/subscription/${profile.subscription}/boundary/${profile.boundary}/function/${profile.function}/build`,
        headers: {
          Authorization: `Bearer ${profile.accessToken}`,
        },
        data: functionSpec,
      }
    );

    if (!result) {
      await this.executeService.info('No Change', 'The function has not changed since the previous deployment');
      return this.getFunctionUrl(profile.function, true);
    }

    if (result.status === 'pending' || result.status === 'building') {
      const url = [
        `${profile.baseUrl}/v1/account/${profile.account}/subscription/${profile.subscription}/`,
        `boundary/${profile.boundary}/function/${profile.function}/build/${result.buildId}`,
      ].join('');
      result = await this.executeService.executeRequest(
        {
          header: 'Build Function',
          message: Text.create(
            "Building function '",
            Text.bold(`${profile.function}`),
            "' in boundary '",
            Text.bold(`${profile.boundary}`),
            "'..."
          ),
          errorHeader: 'Build Function Error',
          errorMessage: Text.create(
            "Unable to build function '",
            Text.bold(`${profile.function}`),
            "' in boundary '",
            Text.bold(`${profile.boundary}`),
            "'"
          ),
        },
        {
          method: 'GET',
          url,
          headers: { Authorization: `Bearer ${profile.accessToken}` },
        },
        true
      );
    }

    if (result.status !== 'success') {
      const message =
        result.error && result.error.message
          ? result.error.message
          : result.message ||
            Text.create(
              "Unable to deploy function '",
              Text.bold(`${profile.function}`),
              "' in boundary '",
              Text.bold(`${profile.boundary}`),
              "'"
            );
      await this.executeService.error('Deploy Function Error', message);
    }

    return result.location as string;
  }

  public async confirmOverrideWithTemplate(): Promise<void> {
    if (!this.input.options.quiet) {
      const confirmPrompt = await Confirm.create({
        header: 'Overwrite?',
        message: Text.create(
          'The function already exists. Do you want to overwrite it with a new function created from the template?'
        ),
      });
      const confirmed = await confirmPrompt.prompt(this.input.io);
      if (!confirmed) {
        await this.executeService.warning(
          'Canceled',
          Text.create('Overriding an existing function with a template was canceled')
        );
        throw new Error('Canceled');
      }
    }
  }

  public async confirmInitFunction(path: string): Promise<void> {
    if (!this.input.options.quiet) {
      const files = await getTemplateOverWriteFiles(path);
      if (files.length) {
        const confirmPrompt = await Confirm.create({
          header: 'Overwrite?',
          message: Text.create("The '", Text.bold(path), "' directory is not empty. Overwrite the files below?"),
          details: this.getFileConfirmDetails(files),
        });
        const confirmed = await confirmPrompt.prompt(this.input.io);
        if (!confirmed) {
          await this.executeService.warning(
            'Init Canceled',
            Text.create("Initialzing the function at '", Text.bold(path), "' was canceled")
          );
          throw new Error('Init Canceled');
        }
      }
    }
  }

  public async confirmSaveFunction(path: string, functionSpec: any, functionId?: string): Promise<void> {
    if (!this.input.options.quiet) {
      const files = await getSaveOverWriteFiles(path, functionSpec);
      if (files.length) {
        const confirmPrompt = await Confirm.create({
          header: 'Overwrite?',
          message: Text.create("The '", Text.bold(path), "' directory is not empty. Overwrite the files below?"),
          details: this.getFileConfirmDetails(files),
        });
        const confirmed = await confirmPrompt.prompt(this.input.io);
        if (!confirmed) {
          await this.executeService.warning(
            'Download Canceled',
            Text.create("Downloading the function to '", Text.bold(path), "' was canceled")
          );
          throw new Error('Get Canceled');
        }
      }
    }
  }

  public async confirmListMore(): Promise<boolean> {
    const result = await this.input.io.prompt({ prompt: 'Get More Functions?', yesNo: true });
    return result.length > 0;
  }

  public async confirmDeploy(path: string, functionSpec: any, functionId?: string, cron?: string): Promise<void> {
    if (!this.input.options.quiet) {
      const profile = await this.getFunctionExecutionProfile(true, functionId, path);

      const files = await getTemplateOverWriteFiles(path);
      if (files.length) {
        const confirmPrompt = await Confirm.create({
          header: 'Deploy?',
          message: Text.create("Deploy the function in the '", Text.bold(path), "' directory as given below?"),
          details: await this.getConfirmDeployDetails(profile, functionSpec, cron),
        });
        const confirmed = await confirmPrompt.prompt(this.input.io);
        if (!confirmed) {
          await this.executeService.warning(
            'Deploy Canceled',
            Text.create("Deploying the '", Text.bold(`${profile.function}`), "'function was canceled")
          );
          throw new Error('Deploy Canceled');
        }
      }
    }
  }

  public async confirmRemove(functionSpec: any): Promise<void> {
    if (!this.input.options.quiet) {
      const confirmPrompt = await Confirm.create({
        header: 'Remove?',
        message: Text.create("Permanently remove the '", Text.bold(functionSpec.id), "' function as shown below?"),
        details: await this.getConfirmRemoveDetails(functionSpec),
      });
      const confirmed = await confirmPrompt.prompt(this.input.io);
      if (!confirmed) {
        await this.executeService.warning(
          'Remove Canceled',
          Text.create("Removing the '", Text.bold(functionSpec.id), "' function was canceled")
        );
        throw new Error('Remove Canceled');
      }
    }
  }

  public async displayFunctionUrl(url: string) {
    const output = this.input.options.output;
    if (!output || output === 'raw') {
      await this.input.io.writeLineRaw(url);
    } else if (output === 'json') {
      await this.input.io.writeLineRaw(JSON.stringify({ location: url }, null, 2));
    } else {
      await this.executeService.result('Function Url', 'The function can be executed at the URL given below:');
      await this.input.io.writeLineRaw(url);
      await this.input.io.writeLine();
    }
  }

  public async displayFunctions(functions: IFusebitFunctionShort[], firstDisplay: boolean) {
    if (!functions.length) {
      await this.executeService.info('No Functions', `No ${firstDisplay ? '' : 'more '}functions to list`);
      return;
    }

    const boundaries: { [index: string]: string[] } = {};
    for (const functionShort of functions) {
      const { boundaryId, functionId } = functionShort;
      boundaries[boundaryId] = boundaries[boundaryId] || [];
      boundaries[boundaryId].push(functionId);
    }

    const message = await Message.create({
      header: Text.cyan('Boundaries'),
      message: Text.cyan('Functions'),
    });
    await message.write(this.input.io);

    for (const boundary in boundaries) {
      await this.writeBoundary(boundary, boundaries[boundary]);
    }
  }

  public async displayFunctionSave(path: string, files: string[], functionId?: string) {
    const profile = await this.getFunctionExecutionProfile(true, functionId, path);

    const output = this.input.options.output as string;
    if (output === 'json') {
      await this.input.io.writeLineRaw(JSON.stringify({ path, files }, null, 2));
      return;
    }

    const message: IText[] = [
      "The function '",
      Text.bold(`${profile.function}`),
      "' in boundary '",
      Text.bold(`${profile.boundary}`),
      "' was downloaded to directory '",
      Text.bold(path),
      "' and the following files were written to disk: ",
      Text.eol(),
    ];
    for (const file of files) {
      message.push(Text.eol());
      message.push(Text.dim('• '));
      message.push(file);
    }

    this.executeService.result('Function Downloaded', Text.create(message));
  }

  public async displayFunction(functionSpec: any, showSettings: boolean = false) {
    if (functionSpec.configuration && !showSettings) {
      for (const key of Object.keys(functionSpec.configuration)) {
        functionSpec.configuration[key] = hiddenValue;
      }
    }

    const functionData = {
      id: functionSpec.id,
      accountId: functionSpec.accountId,
      subscriptionId: functionSpec.subscriptionId,
      boundaryId: functionSpec.boundaryId,
      files: functionSpec.nodejs && functionSpec.nodejs.files ? Object.keys(functionSpec.nodejs.files) : [],
      encodedFiles:
        functionSpec.nodejs && functionSpec.nodejs.encodedFiles ? Object.keys(functionSpec.nodejs.encodedFiles) : [],
      configuration: functionSpec.configuration,
      location: functionSpec.location,
      runtime: functionSpec.runtime,
      security: functionSpec.security,
      routes: functionSpec.routes,
    };

    if (this.input.options.output === 'json') {
      this.input.io.writeLineRaw(JSON.stringify(functionData, null, 2));
    } else {
      const details = [
        Text.dim('Account: '),
        functionData.accountId,
        Text.eol(),
        Text.dim('Subscription: '),
        functionData.subscriptionId,
        Text.eol(),
        Text.dim('Boundary: '),
        functionData.boundaryId,
        Text.eol(),
        Text.dim('Function: '),
        functionData.id,
      ];

      if (functionData.runtime && functionData.runtime.tags) {
        const redirect = functionData.runtime.tags['ephemeral.redirect'];
        delete functionData.runtime.tags['ephemeral.redirect'];

        if (redirect) {
          details.push(Text.eol(), Text.eol(), Text.bold('Redirected to: '), Text.red(redirect));
        }

        details.push(Text.eol(), Text.eol(), Text.dim('Tags'));

        details.push(
          Text.create(
            Object.keys(functionData.runtime.tags).map((key: string) =>
              Text.create(Text.eol(), Text.dim('• '), key, Text.dim(': '), `${functionData.runtime.tags[key]}`)
            )
          )
        );
      }
      details.push(Text.eol());
      details.push(Text.eol());

      details.push(Text.dim('Files'));
      details.push(Text.create(functionData.files.map((file) => Text.create(Text.eol(), Text.dim('• '), file))));

      if (functionData.encodedFiles.length > 0) {
        details.push(Text.eol());
        details.push(Text.eol());

        details.push(Text.dim('Encoded Files'));
        details.push(
          Text.create(functionData.encodedFiles.map((file) => Text.create(Text.eol(), Text.dim('• '), file)))
        );
      }

      if (functionData.configuration) {
        const keys = Object.keys(functionData.configuration);
        if (keys && keys.length) {
          details.push(Text.eol());
          details.push(Text.eol());
          details.push(Text.dim('Configuration'));
          for (const key of keys) {
            const value = functionData.configuration[key];
            details.push(Text.eol());
            details.push(Text.dim('• '));
            details.push(`${key} = `);
            details.push(value === hiddenValue ? Text.dim(value) : value);
          }
        }
      }

      details.push(Text.eol());
      details.push(Text.eol());
      details.push(Text.dim('The execution URL of the function is given below:'));

      await this.executeService.result(Text.bold(functionData.id), Text.create(details));
      await this.input.io.writeLineRaw(functionSpec.location);
      await this.input.io.writeLine();
    }
  }

  private async getConfirmDeployDetails(profile: IFusebitExecutionProfile, functionSpec: any, cron?: string) {
    const scheduleSource = cron ? Text.empty() : fromFusebitJson;
    let schedule = notSet;
    if (functionSpec.schedule && functionSpec.schedule.cron) {
      const timezone = functionSpec.schedule.timezone ? ` ${functionSpec.schedule.timezone}` : '';
      schedule = Text.create(functionSpec.schedule.cron, timezone, scheduleSource);
    }

    const details = [
      { name: 'Account', value: profile.account || '' },
      { name: 'Subscription', value: profile.subscription || '' },
      { name: 'Boundary', value: profile.boundary || '' },
      { name: 'Function', value: profile.function || '' },
      { name: 'Files', value: Object.keys(functionSpec.nodejs.files).join(' ') },
      { name: 'Encoded Files', value: Object.keys(functionSpec.nodejs.encodedFiles).join(' ') },
      { name: 'Configuration', value: functionSpec.configurationSerialized ? `<set via ${envFileName}>` : notSet },
      { name: 'Schedule', value: schedule },
    ];

    return details;
  }

  private async getConfirmRemoveDetails(functionSpec: any) {
    const appSettings = Object.keys(functionSpec.configuration || {}).join(' ');

    let schedule = notSet;
    if (functionSpec.schedule && functionSpec.schedule.cron) {
      const timezone = functionSpec.schedule.timezone ? ` ${functionSpec.schedule.timezone}` : '';
      schedule = Text.create(functionSpec.schedule.cron, timezone);
    }

    return [
      { name: 'Account', value: functionSpec.accountId },
      { name: 'Subscription', value: functionSpec.subscriptionId },
      { name: 'Boundary', value: functionSpec.boundaryId },
      { name: 'Function', value: functionSpec.id },
      { name: 'Files', value: Object.keys(functionSpec.nodejs.files).join(' ') },
      { name: 'Application Settings', value: appSettings ? appSettings : notSet },
      { name: 'Schedule', value: schedule },
    ];
  }

  private getFileConfirmDetails(files: string[]) {
    return files.map((file) => ({ name: Text.dim('• '), value: file }));
  }

  private async writeBoundary(boundaryName: string, functions: string[]) {
    const functionList = Text.join(functions, Text.eol());
    await this.executeService.message(Text.bold(boundaryName), functionList);
  }

  private getEditorHtml(profile: IFusebitExecutionProfile, theme: string, functionSpec?: any): string {
    const template = functionSpec || {};
    const editorSettings = (functionSpec &&
      functionSpec.metadata &&
      functionSpec.metadata.fusebit &&
      functionSpec.metadata.fusebit.editor) || {
      theme,
    };

    const fusebitEditorUrl =
      process.env.FUSEBIT_EDITOR_URL || 'https://cdn.fusebit.io/fusebit/js/fusebit-editor/latest/fusebit-editor.min.js';

    return `<!doctype html>
  <html lang="en">
  <head>
    <meta charset="utf-8" />
  
      <link rel="icon" type="image/png" sizes="32x32" href="https://fusebit.io/favicon-32x32.png" />
      <link rel="icon" type="image/png" sizes="16x16" href="https://fusebit.io/favicon-16x16.png" />
      <meta http-equiv="X-UA-Compatible" content="IE=edge,chrome=1" />
  
      <title>${profile.function}</title>
  
      <meta content='width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0' name='viewport' />
      <meta name="viewport" content="width=device-width" />
  
      <style>
          html,body {
              width: 95%;
              height: 95%;
          }
      </style>
  
  </head>
  <body>
      <div id="editor" style="width:800px;height:500px;margin-top:30px;margin-left:auto;margin-right:auto">
  </body>
  
  <script src="${fusebitEditorUrl}"></script>
  <script type="text/javascript">
    const options = {
      template: ${JSON.stringify(template, null, 2)},
      editor: {
        features: {},
        ...${JSON.stringify(editorSettings, null, 2)},
      },
    };

    // Set it explicitly after getting, so it's easier to discover even if previously unset.
    const enableGrafanaLogs = window.location.search.includes('enableGrafanaLogs') || localStorage.getItem('enableGrafanaLogs') === 'true';
    localStorage.setItem('enableGrafanaLogs', \`\${!!enableGrafanaLogs}\`);
    options.editor.features.enableGrafanaLogs = enableGrafanaLogs;

    fusebit.createEditor(document.getElementById('editor'), '${profile.boundary}', '${profile.function}', {
        accountId: '${profile.account}',
        subscriptionId: '${profile.subscription}',
        baseUrl: '${profile.baseUrl}',
        accessToken: '${profile.accessToken}',
    }, options).then(editorContext => {
        editorContext.setFullScreen(true);
    });
  </script>
  
  </html>  
  `;
  }
}
