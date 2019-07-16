import { join } from 'path';
import { createServer } from 'http';
import open from 'open';
import { parse, serialize } from '@5qtrs/key-value';
import { readFile, readDirectory, exists, copyDirectory, writeFile } from '@5qtrs/file';
import { IFusebitExecutionProfile } from '@5qtrs/fusebit-profile-sdk';
import { Message, IExecuteInput, Confirm } from '@5qtrs/cli';
import { ExecuteService } from './ExecuteService';
import { ProfileService, IFusebitProfileDefaults } from './ProfileService';
import { Text, IText } from '@5qtrs/text';
import { VersionService } from './VersionService';

// ------------------
// Internal Constants
// ------------------

const envFileName = '.env';
const cronOffRegex = /^off$/i;
const fromProfile = Text.dim(' (from profile)');
const fromFusebitJson = Text.dim(' (from fusebit.json)');
const fromEnvFile = Text.dim(` (from ${envFileName})`);
const notSet = Text.dim(Text.italic('<not set>'));
const hiddenValue = '****';

// ------------------
// Internal Functions
// ------------------

function getTemplateDirectoryPath(): string {
  return join(__dirname, '../../template');
}

async function getTemplateFiles(): Promise<string[]> {
  return readDirectory(getTemplateDirectoryPath(), { joinPaths: false, filesOnly: true });
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
  const functionFiles =
    functionSpec && functionSpec.nodejs && functionSpec.nodejs.files ? Object.keys(functionSpec.nodejs.files) : [];
  if (functionSpec.configuration && Object.keys(functionSpec.configuration).length > 0) {
    functionFiles.push(envFileName);
  } else if (functionSpec.metadata && functionSpec.metadata.fusebit && functionSpec.metadata.fusebit.appSettings) {
    functionFiles.push(envFileName);
  }

  const existingFiles = await readDirectory(path, { recursive: false, filesOnly: true, joinPaths: false });

  const overwriteFiles = [];
  for (const file of functionFiles) {
    if (existingFiles.indexOf(file) >= 0) {
      overwriteFiles.push(file);
    }
  }

  return overwriteFiles;
}

function setFunctionSpecSchedule(functionSpec: any, cron?: string, timezone?: string) {}

function ensureFusebitMetadata(functionSpec: any, create?: boolean): any {
  if (!functionSpec.metadata) {
    if (create) {
      functionSpec.metadata = {};
    } else {
      return {};
    }
  }
  if (!functionSpec.metadata.fusebit) {
    if (create) {
      functionSpec.metadata.fusebit = {};
    } else {
      return {};
    }
  }
  return functionSpec.metadata.fusebit;
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
  private versionService: VersionService;
  private profileService: ProfileService;

  private constructor(
    profileService: ProfileService,
    versionService: VersionService,
    executeService: ExecuteService,
    input: IExecuteInput
  ) {
    this.input = input;
    this.profileService = profileService;
    this.versionService = versionService;
    this.executeService = executeService;
  }

  public static async create(input: IExecuteInput) {
    const executeService = await ExecuteService.create(input);
    const versionService = await VersionService.create(input);
    const profileService = await ProfileService.create(input);
    return new FunctionService(profileService, versionService, executeService, input);
  }

  public async getFunctionExecutionProfile(functionRequired: boolean, functionId?: string, fusebitJsonPath?: string) {
    const defaults: IFusebitProfileDefaults = { function: functionId };
    if (fusebitJsonPath) {
      const fusebit = await this.getFusebitJson(fusebitJsonPath);
      if (fusebit) {
        defaults.function = defaults.function || fusebit.id;
        defaults.boundary = fusebit.boundaryId;
        defaults.subscription = fusebit.subscriptionId;
      }
    }
    const expected = ['account', 'subscription', 'boundary'];
    if (functionRequired) {
      expected.push('function');
    }
    return this.profileService.getExecutionProfile(expected, defaults);
  }

  public async getFunctionSpec(path: string, cron?: string, timezone?: string): Promise<any> {
    const functionSpec: any = { nodejs: { files: {} }, lambda: { memorySize: 128, timeout: 30 } };
    const fusebitJson = (await this.getFusebitJson(path)) || {};

    if (fusebitJson.metadata) {
      functionSpec.metadata = fusebitJson.metadata;
    }
    functionSpec.metadata = functionSpec.metadata || {};
    functionSpec.metadata.fusebit = functionSpec.metadata.fusebit || {};

    // lambda & computeSettings
    if (fusebitJson.lambda) {
      functionSpec.lambda = fusebitJson.lambda;
      functionSpec.metadata.fusebit.computeSettings = serialize(functionSpec.lambda);
    } else if (
      fusebitJson &&
      fusebitJson.metadata &&
      fusebitJson.metadata.fusebit &&
      fusebitJson.metadata.fusebit.computeSettings
    ) {
      functionSpec.metadata.fusebit.computeSettings = fusebitJson.metadata.fusebit.computeSettings;
    }

    // schedule and cronSettings
    const cronDisabled = cronOffRegex.test(cron || '');
    if (cronDisabled) {
      delete functionSpec.metadata.cronSettings;
      delete functionSpec.metadata.fusebit.cronSettings;
    } else {
      if (cron) {
        functionSpec.schedule = { cron };
        if (timezone) {
          functionSpec.schedule.timezone = timezone;
          functionSpec.metadata.fusebit.cronSettings = serialize(functionSpec.schedule);
        }
      } else if (timezone) {
        await this.executeService.error(
          'Invalid Option',
          Text.create(
            "The '",
            Text.bold('--timezone'),
            "' options can only be set for functions with with cron enabled."
          )
        );
      } else if (fusebitJson.schedule && fusebitJson.schedule.cron) {
        functionSpec.schedule = fusebitJson.schedule;
      }
    }

    // nodejs files & configuration & applicationSettings
    const files = await readDirectory(path, { filesOnly: true, joinPaths: false, recursive: false });
    for (const file of files) {
      if (file !== '.gitignore' && file !== 'fusebit.json') {
        const content = await readFile(join(path, file));
        const contentString = content ? content.toString() : undefined;
        if (contentString) {
          if (file === envFileName) {
            functionSpec.configuration = parse(contentString);
            functionSpec.metadata = functionSpec.metadata || {};
            functionSpec.metadata.fusebit = functionSpec.metadata.fusebit || {};
            functionSpec.metadata.fusebit.applicationSettings = contentString;
          } else {
            functionSpec.nodejs.files[file] = contentString;
          }
        }
      }
    }

    if (!functionSpec.nodejs.files['index.js']) {
      this.executeService.error(
        'Invalid Function',
        Text.create(
          "The function must include an'",
          Text.bold('index.js'),
          "' file. Make sure it exists in the source directory."
        )
      );
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

  public async setFusebitJson(path: string, functionId: string, functionSpec: any): Promise<void> {
    const profile = await this.getFunctionExecutionProfile(true, functionId, path);
    const version = await this.versionService.getVersion();

    const fusebitJson = (await this.getFusebitJson(path)) || {};

    fusebitJson.subscriptionId = profile.subscription;
    fusebitJson.boundaryId = profile.boundary;
    fusebitJson.id = profile.function;
    fusebitJson.fuseVersion = version;

    // metadata
    if (functionSpec.metadata) {
      fusebitJson.metadata = functionSpec.metadata;
    }

    fusebitJson.metadata = functionSpec.metadata || {};
    fusebitJson.metadata.fusebit = fusebitJson.metadata.fusebit || {};

    // location
    if (functionSpec.location) {
      fusebitJson.location = functionSpec.location;
    }

    // no application settings
    delete fusebitJson.metadata.applicationSettings;
    delete fusebitJson.metadata.fusebit.applicationSettings;

    // no lambda but compute setting
    if (functionSpec.lambda) {
      fusebitJson.metadata.fusebit.computeSettings = serialize(functionSpec.lambda);
      delete fusebitJson.lambda;
    }

    // schedule & cronSettings
    if (!functionSpec.schedule) {
      delete fusebitJson.schedule;
      delete fusebitJson.metadata.cronSettings;
      delete fusebitJson.metadata.fusebit.cronSettings;
    } else {
      fusebitJson.schedule = functionSpec.schedule;
    }

    try {
      await writeFile(join(path, 'fusebit.json'), JSON.stringify(fusebitJson, null, 2));
    } catch (error) {
      this.executeService.error(
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
          const content = filesToWrite[file];
          await writeFile(join(path, file), content);
          files.push(file);
        }
      }

      if (functionSpec.metadata && functionSpec.metadata.fusebit && functionSpec.metadata.fusebit.applicationSettings) {
        await writeFile(join(path, envFileName), functionSpec.metadata.fusebit.applicationSettings);
        files.push(envFileName);
      } else if (functionSpec.configuration) {
        const content = serialize(functionSpec.configuration);
        if (content) {
          await writeFile(join(path, envFileName), content);
          files.push(envFileName);
        }
      }
    }

    return files;
  }

  public async startEditServer(functionId?: string, theme: string = 'light') {
    const profile = await this.getFunctionExecutionProfile(true, functionId, process.cwd());

    if (theme !== 'light' && theme !== 'dark') {
      this.executeService.error('Edit Function Error', Text.create(''));
      throw new Error('Edit Function Error');
    }

    const editorHtml = this.getEditorHtml(profile, theme);
    const startServer = (port: number) => {
      return new Promise((resolve, reject) => {
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
        open(`http://127.0.0.1:${port}`);
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
      this.executeService.error(
        'Edit Function Error',
        'Unable to find a free port in the 80xx range to host a local service. Please try again.'
      );
      return;
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
        Text.bold(`http://127.0.0.1:${port}`),
        Text.eol(),
        'If the browser does not open automatically, navigate to this URL.',
        Text.eol(),
        Text.eol(),
        'Ctrl-C to terminate...'
      )
    );

    await new Promise(() => {});
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
          `${profile.subscription}/boundary/${profile.boundary}/function/${profile.function}`,
        ].join(''),
        headers: { Authorization: `bearer ${profile.accessToken}` },
      }
    );

    result.accountId = profile.account;

    return result;
  }

  public async listFunctions(options: IFusebitFunctionListOptions): Promise<IFusebitFunctionListResult> {
    let profile = await this.profileService.getExecutionProfile(['subscription']);
    let cronMessage = '';

    const query = [];
    if (options.cron !== undefined) {
      cronMessage = options.cron ? 'CRON ' : 'non-CRON ';
      query.push(`cron=${options.cron}`);
    }
    if (options.count) {
      query.push(`count=${options.count}`);
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
        url: `${profile.baseUrl}/v1/account/${profile.account}/subscription/${
          profile.subscription
        }${boundaryUrl}${queryString}`,
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
      this.executeService.error('Init Function Error', 'Failed to initialize the function', error);
      return;
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
        Text.create(files.map(file => Text.create(Text.dim('• '), file, Text.eol()))),
        Text.eol(),
        "You can deploy the function with the '",
        Text.bold('function deploy'),
        "' command."
      )
    );
  }

  public async deployFunction(path: string, functionId: string, functionSpec: any): Promise<string> {
    const profile = await this.getFunctionExecutionProfile(true, functionId, path);

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
        method: 'PUT',
        url: `${profile.baseUrl}/v1/account/${profile.account}/subscription/${profile.subscription}/boundary/${
          profile.boundary
        }/function/${profile.function}`,
        headers: {
          Authorization: `Bearer ${profile.accessToken}`,
        },
        data: functionSpec,
      }
    );

    if (!result) {
      await this.executeService.info('No Change', 'The function has not changed since the previous deployment');
      return this.getFunctionUrl(functionId, true);
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
      this.executeService.error('Deploy Function Error', message);
    }

    return result.location as string;
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
          details: await this.getConfirmDeployDetails(profile, functionSpec, functionId, cron),
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
    let applicationSettings = functionSpec.configuration ? functionSpec.configuration : undefined;
    if (functionSpec.metadata && functionSpec.metadata.fusebit && functionSpec.metadata.fusebit.applicationSettings) {
      applicationSettings = parse(functionSpec.metadata.fusebit.applicationSettings);
    }

    if (applicationSettings && !showSettings) {
      for (const key of Object.keys(applicationSettings)) {
        applicationSettings[key] = hiddenValue;
      }
    }

    const functionData = {
      id: functionSpec.id,
      accountId: functionSpec.accountId,
      subscriptionId: functionSpec.subscriptionId,
      boundaryId: functionSpec.boundaryId,
      files: functionSpec.nodejs && functionSpec.nodejs.files ? Object.keys(functionSpec.nodejs.files) : [],
      applicationSettings,
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
        Text.eol(),
        Text.eol(),
        Text.dim('Files'),
        Text.create(functionData.files.map(file => Text.create(Text.eol(), Text.dim('• '), file))),
      ];

      if (applicationSettings) {
        const keys = Object.keys(functionData.applicationSettings);
        if (keys && keys.length) {
          details.push(Text.eol());
          details.push(Text.eol());
          details.push(Text.dim('Application Settings'));
          for (const key of keys) {
            const value = functionData.applicationSettings[key];
            details.push(Text.eol());
            details.push(Text.dim('• '));
            details.push(`${key} = `);
            details.push(value === hiddenValue ? Text.dim(value) : value);
          }
        }
      }

      this.executeService.result(Text.bold(functionData.id), Text.create(details));
    }
  }

  private async getConfirmDeployDetails(
    profile: IFusebitExecutionProfile,
    functionSpec: any,
    functionId?: string,
    cron?: string
  ) {
    const fusebitJson = (await this.getFusebitJson()) || {};

    const subscriptionSource = fusebitJson.subscriptionId ? fromFusebitJson : fromProfile;
    const boundarySource = fusebitJson.boundaryId ? fromFusebitJson : fromProfile;
    const functionSource = functionId ? undefined : fusebitJson.id ? fromFusebitJson : fromProfile;
    const appSettings = Object.keys(functionSpec.configuration || {}).join(' ');

    const scheduleSource = cron ? Text.empty() : fromFusebitJson;
    let schedule = notSet;
    if (functionSpec.schedule && functionSpec.schedule.cron) {
      const timezone = functionSpec.schedule.timezone ? ` ${functionSpec.schedule.timezone}` : '';
      schedule = Text.create(functionSpec.schedule.cron, timezone, scheduleSource);
    }

    const details = [
      { name: 'Account', value: profile.account },
      { name: 'Subscription', value: Text.create(profile.subscription || '', subscriptionSource) },
      { name: 'Boundary', value: Text.create(profile.boundary || '', boundarySource) },
      { name: 'Function', value: Text.create(profile.function || '', functionSource || '') },
      { name: 'Files', value: Object.keys(functionSpec.nodejs.files).join(' ') },
      { name: 'Application Settings', value: appSettings ? Text.create(appSettings, fromEnvFile) : notSet },
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
    return files.map(file => ({ name: Text.dim('• '), value: file }));
  }

  private async writeBoundary(boundaryName: string, functions: string[]) {
    const functionList = Text.join(functions, Text.eol());
    await this.executeService.message(Text.bold(boundaryName), functionList);
  }

  private getEditorHtml(profile: IFusebitExecutionProfile, theme: string): string {
    return `<!doctype html>
  <html lang="en">
  <head>
    <meta charset="utf-8" />
  
      <link rel="icon" type="image/png" sizes="32x32" href="https://fusebit.io/favicon-32x32.png" />
      <link rel="icon" type="image/png" sizes="16x16" href="https://fusebit.io/favicon-16x16.png" />
      <meta http-equiv="X-UA-Compatible" content="IE=edge,chrome=1" />
  
      <title>Fusebit ${profile.function}</title>
  
      <meta content='width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0' name='viewport' />
      <meta name="viewport" content="width=device-width" />
  
      <style>
          html,body {
              width: 100%;
              height: 100%;
          }
      </style>
  
  </head>
  <body>
      <div id="editor" style="width:800px;height:500px;margin-top:30px;margin-left:auto;margin-right:auto">
  </body>
  
  <script src="https://cdn.fusebit.io/fusebit/js/fusebit-editor/latest/fusebit-editor.min.js"></script>
  <script type="text/javascript">
    fusebit.createEditor(document.getElementById('editor'), '${profile.boundary}', '${profile.function}', {
        accountId: '${profile.account}',
        subscriptionId: '${profile.subscription}',
        baseUrl: '${profile.baseUrl}',
        accessToken: '${profile.accessToken}',
    }, {
        template: {},
        editor: {
          theme: '${theme}',
        },
    }).then(editorContext => {
        editorContext.setFullScreen(true);
    });
  </script>
  
  </html>  
  `;
  }
}
