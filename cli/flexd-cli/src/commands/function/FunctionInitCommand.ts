import { EOL } from 'os';
import { Command, ArgType, IExecuteInput, Message } from '@5qtrs/cli';
import { ProfileService, ExecuteService } from '../../services';
import * as Path from 'path';
import * as Fs from 'fs';
import { Text } from '@5qtrs/text';

export class FunctionInitCommand extends Command {
  private constructor() {
    super({
      name: 'Initialize Function',
      cmd: 'init',
      summary: 'Scaffold a new function in the specified directory.',
      description: [
        'Creates scaffolding of a new function in the specified directory on disk.',
        'If the directory is not specified, working directory is used. The directory must be empty',
        'unless the --force option is specified.',
        `${EOL}${EOL}The function can be later deployed using \`flx function deploy\`.`,
      ].join(' '),
      arguments: [
        {
          name: 'dest',
          description: [
            'A path to the directory where the function files will be placed.',
            `If not specified, the current working directory is used.`,
          ].join(' '),
          required: false,
          default: '',
        },
      ],
      options: [
        {
          name: 'force',
          description: 'Enables initialization of a function in a non-empty directory.',
          type: ArgType.boolean,
          default: 'false',
        },
      ],
      ignoreOptions: ['profile', 'boundary', 'subscription'],
      modes: [],
    });
  }

  public static async create() {
    return new FunctionInitCommand();
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    let profileService = await ProfileService.create(input);
    const executeService = await ExecuteService.create(input);
    let profile = await profileService.getExecutionProfile(['subscription', 'boundary', 'function']);

    let destDirectory = Path.join(process.cwd(), input.arguments[0] as string);

    const result = await executeService.execute(
      {
        header: 'Initialize Function',
        message: Text.create('Initialize a new function in ', Text.bold(destDirectory), ' directory'),
        errorHeader: 'Initialize Function Error',
        errorMessage: 'Unable to initialize the function',
      },
      async () => {
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

        let files: string[] = [];
        let dirs = Fs.readdirSync(Path.join(__dirname, '../../../template'));
        for (var i = 0; i < dirs.length; i++) {
          let f = dirs[i];
          if (f === '.flexd.json') {
            files.push('.flexd/function.json');
            Fs.mkdirSync(Path.join(destDirectory, '.flexd'), { recursive: true });
            Fs.writeFileSync(
              Path.join(destDirectory, '.flexd', 'function.json'),
              Fs.readFileSync(Path.join(__dirname, '../../../template', f), 'utf8'),
              'utf8'
            );
          } else {
            files.push(f);
            Fs.writeFileSync(
              Path.join(destDirectory, f),
              Fs.readFileSync(Path.join(__dirname, '../../../template', f), 'utf8'),
              'utf8'
            );
          }
        }
        Fs.writeFileSync(Path.join(destDirectory, '.gitignore'), `.env`, 'utf8');
        files.push('.gitignore');

        await (await Message.create({
          header: 'Generated Files',
          message: files.join('\n'),
        })).write(input.io);

        await input.io.writeLine('Done. You can deploy the function with `flx function deploy`.');

        return 0;
      }
    );

    return 0;
  }
}
