import { Command, ArgType, IExecuteInput } from '@5qtrs/cli';
import { ProfileService } from '../../services';

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
    let profileService = await ProfileService.create(input);
    let profile = await profileService.getExecutionProfile(['subscription', 'boundary']);

    let url: string = input.options.function
      ? `${profile.baseUrl}/v1/subscription/${profile.subscription}/boundary/${profile.boundary}/function/${
          profile.function
        }/log?token=${profile.token}`
      : `${profile.baseUrl}/v1/subscription/${profile.subscription}/boundary/${profile.boundary}/log?token=${
          profile.token
        }`;

    let driver = url.match(/^https/i) ? require('https') : require('http');
    return new Promise<number>((resolve, reject) => {
      let req = driver.request(url, (res: any) => {
        if (res.statusCode !== 200) {
          throw new Error(`Error attaching to streaming logs. HTTP status ${res.statusCode}.`);
        }
        if (input.options.function) {
          console.log(`Attached to streaming logs of function ${input.options.boundary}/${input.options.function}.`);
        } else {
          console.log(`Attached to streaming logs of boundary ${input.options.boundary}.`);
        }
        res.setEncoding('utf8');
        res.on('data', processChunk);
        res.on('end', () => {
          console.log('Streaming logs connection terminated.');
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
}
