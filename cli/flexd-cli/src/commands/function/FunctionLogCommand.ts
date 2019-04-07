import { Command, ArgType, IExecuteInput, Message } from '@5qtrs/cli';
import { ProfileService, ExecuteService, tryGetFlexd, getProfileSettingsFromFlexd } from '../../services';
import { Text } from '@5qtrs/text';

export class FunctionLogCommand extends Command {
  private constructor() {
    super({
      name: 'Get Function Logs',
      cmd: 'log',
      summary: 'Stream real-time logs',
      description: [`Streams stdout and stderr from a specific function or all functions in a specific boundary.`].join(
        ' '
      ),
      options: [
        {
          name: 'function',
          aliases: ['f'],
          description: 'The function id to stream real-time logs from.',
        },
        {
          name: 'format',
          description: ['The format of the log entries. Supported formats include:', "'bunyan' and 'console'."].join(
            ' '
          ),
          default: 'console',
        },
      ],
      arguments: [],
      modes: [],
    });
  }

  public static async create() {
    return new FunctionLogCommand();
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    await input.io.writeLine();

    let profileService = await ProfileService.create(input);
    const executeService = await ExecuteService.create(input);
    let profile = await profileService.getExecutionProfile(
      ['subscription', 'boundary'],
      getProfileSettingsFromFlexd(tryGetFlexd())
    );

    await executeService.execute(
      {
        header: 'Get Function Logs',
        message: Text.create(
          profile.function
            ? `Get logs of the ${Text.bold(profile.boundary as string)}/${Text.bold(profile.function)} function`
            : `Get logs of all functions in the ${Text.bold(profile.boundary as string)} boundary`,
          ' on account ',
          Text.bold(profile.account || ''),
          ' and subscription ',
          Text.bold(profile.subscription || ''),
          '.'
        ),
        errorHeader: 'Get Function Logs Error',
        errorMessage: 'Unable to get the function logs',
      },
      async () => {
        let url: string = input.options.function
          ? `${profile.baseUrl}/v1/account/${profile.account}/subscription/${profile.subscription}/boundary/${
              profile.boundary
            }/function/${profile.function}/log?token=${profile.accessToken}`
          : `${profile.baseUrl}/v1/account/${profile.account}/subscription/${profile.subscription}/boundary/${
              profile.boundary
            }/log?token=${profile.accessToken}`;

        let driver = url.match(/^https/i) ? require('https') : require('http');
        return new Promise<number>(async (resolve, reject) => {
          let req = driver.request(url, async (res: any) => {
            if (res.statusCode !== 200) {
              throw new Error(`Error attaching to streaming logs. HTTP status ${res.statusCode}.`);
            }
            if (profile.function) {
              await (await Message.create({
                header: `Connected to function logs`,
                message: `${profile.boundary}/${profile.function}`,
              })).write(input.io);
            } else {
              await (await Message.create({
                header: `Connected to boundary logs`,
                message: `${profile.boundary}`,
              })).write(input.io);
            }
            res.setEncoding('utf8');
            res.on('data', processChunk);
            res.on('end', () => {
              input.io.writeLine('Streaming logs connection terminated.');
              return resolve(0);
            });

            let buffer: string = '';
            function processChunk(chunk: string) {
              buffer += chunk;
              let lines = buffer.split('\n');
              // console.log('LINES', lines.length, lines);
              for (let i = 0; i < lines.length - 1; i++) {
                let match = lines[i].match(/^data: (.+)/);
                if (match && lines[i + 1].length === 0) {
                  let entry = match[1];
                  if (input.options.format === 'console') {
                    let parsed: any = JSON.parse(entry);
                    console.log(`${parsed.time} ${parsed.level === 30 ? 'stdout' : 'stderr'}: ${parsed.msg}`);
                  } else {
                    console.log(entry);
                  }
                }
              }
              // console.log(`RECEIVED "${buffer}"`);
              // Since SSE data is delimited with newlines, put last line back into the buffer to be processed
              // only after next chunk is received.
              buffer = lines[lines.length - 1];
            }
          });
          req.on('error', (e: Error) => reject(e));
          req.end();
        });
      }
    );

    return 0;
  }
}
