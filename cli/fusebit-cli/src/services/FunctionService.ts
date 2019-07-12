import { join } from 'path';
import { createServer } from 'http';
import open from 'open';
import { readFile, readDirectory, exists, copyDirectory } from '@5qtrs/file';
import { IFusebitExecutionProfile } from '@5qtrs/fusebit-profile-sdk';
import { Message, IExecuteInput, Confirm } from '@5qtrs/cli';
import { ExecuteService } from './ExecuteService';
import { ProfileService, IFusebitProfileDefaults } from './ProfileService';
import { Text } from '@5qtrs/text';

// ------------------
// Internal Functions
// ------------------

function getTemplateDirectoryPath(): string {
  return join(__dirname, '../../template');
}

async function getTemplateFiles(): Promise<string[]> {
  return readDirectory(getTemplateDirectoryPath(), { joinPaths: false, filesOnly: true });
}

async function getTemplateOverWriteFiles(targetPath: string): Promise<string[]> {
  const templateFiles = await getTemplateFiles();
  const overwriteFiles = [];
  for (const templateFile of templateFiles) {
    const path = join(targetPath, templateFile);
    if (await exists(path)) {
      overwriteFiles.push(templateFile);
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

  public async getFusebitJson(path?: string): Promise<any> {
    try {
      const buffer = await readFile(join(path || process.cwd(), 'fusebit.json'));
      return JSON.parse(buffer.toString());
    } catch (error) {
      // do nothing
    }
  }

  public async getFunctionExecutionProfile(expected: string[], functionId?: string, fusebitJsonPath?: string) {
    const defaults: IFusebitProfileDefaults = { function: functionId };
    if (fusebitJsonPath) {
      const fusebit = await this.getFusebitJson(fusebitJsonPath);
      if (fusebit) {
        defaults.function = defaults.function || fusebit.id;
        defaults.boundary = fusebit.boundaryId;
        defaults.subscription = fusebit.subscriptionId;
      }
    }
    return this.profileService.getExecutionProfile(expected, defaults);
  }

  public async startEditServer(functionId: string, theme: string) {
    const profile = await this.getFunctionExecutionProfile(
      ['account', 'subscription', 'boundary', 'function'],
      functionId,
      process.cwd()
    );

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
        "Editing function '",
        Text.bold(`${profile.boundary}/${profile.function}`),
        "' of account '",
        Text.bold(profile.account || ''),
        "' and subscription '",
        Text.bold(profile.subscription || ''),
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
          `functions of account '`,
          Text.bold(profile.account || ''),
          "', subscription '",
          Text.bold(profile.subscription || ''),
          profile.boundary ? "', boundary '" + Text.bold(profile.boundary) + "'" : "'"
        ),
        errorHeader: 'List Functions Error',
        errorMessage: Text.create("Unable to list the functions of account '", Text.bold(profile.account || ''), "'"),
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

  public async initFunction(targetPath: string): Promise<void> {
    const files = await getTemplateFiles();
    try {
      await copyDirectory(getTemplateDirectoryPath(), targetPath);
    } catch (error) {
      this.executeService.error('Init Function Error', 'Failed to initialize the function', error);
      return;
    }

    const output = this.input.options.output as string;
    if (output === 'json') {
      await this.input.io.writeLineRaw(JSON.stringify({ path: targetPath, files }));
      return;
    }

    await this.executeService.result(
      'Function Initialized',
      Text.create(
        "A new function was initialized in the '",
        Text.bold(targetPath),
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

  public async confirmInitFunction(targetPath: string): Promise<void> {
    if (!this.input.options.quiet) {
      const files = await getTemplateOverWriteFiles(targetPath);
      if (files.length) {
        const confirmPrompt = await Confirm.create({
          header: 'Overwrite?',
          message: Text.create("The '", Text.bold(targetPath), "' directory is not empty. Overwrite the files below?"),
          details: this.getFileConfirmDetails(files),
        });
        const confirmed = await confirmPrompt.prompt(this.input.io);
        if (!confirmed) {
          await this.executeService.warning(
            'Init Canceled',
            Text.create("Initialzing the function at '", Text.bold(targetPath), "' was canceled")
          );
          throw new Error('Init Canceled');
        }
      }
    }
  }

  public async confirmListMore(): Promise<boolean> {
    const result = await this.input.io.prompt({ prompt: 'Get More Functions?', yesNo: true });
    return result.length > 0;
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

  private async writeBoundary(boundaryName: string, functions: string[]) {
    const functionList = Text.join(functions, Text.dim(', '));
    await this.executeService.message(Text.bold(boundaryName), functionList);
  }

  private getFileConfirmDetails(files: string[]) {
    return files.map(file => ({ name: Text.dim('• '), value: file }));
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
