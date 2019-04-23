import { IText } from '@5qtrs/text';
import { EOL } from 'os';
import { ArgType, Command, Help, ICommandIO } from '../src';

// ------------
// Test Helpers
// ------------

function captureHelpText(helpText: string) {
  const withColorCodes = JSON.stringify(helpText);
  const withoutQuotes = withColorCodes.substring(1, withColorCodes.length - 1);
  const wrapped = withoutQuotes.split('\\n').map(text => `        "${text}",`);
  const fullText = [];
  fullText.push('      const expected = [');
  fullText.push(...wrapped);
  fullText.push("      ].join('\\n')");
  return fullText.join('\n');
}

function mockCommandIO() {
  let output = '';
  const io = {
    outputWidth: 80,
    enableStyle: true,
    write: async (text?: IText) => {
      output += text || '';
    },
    writeLine: async (text?: IText) => {
      output += (text || '') + EOL;
    },
    prompt: async (prompt: IText, placeholder?: IText, mask?: boolean) => {
      return '';
    },
    getOutput: () => output,
  };
  return io;
}

// -----
// Tests
// -----

describe('Help', () => {
  describe('getHelpText()', () => {
    it('should return the help text for a command without arguments or options', async () => {
      const help = new Help(
        new Command({
          name: 'Basic Command',
          cmd: 'basic',
          usage: 'basic command',
          description: 'A basic command without arguments or options.',
        })
      );
      const io = mockCommandIO();
      await help.write(io);
      const expected = [
        '',
        '         \u001b[33mUsage:\u001b[39m   basic command',
        '',
        '   \u001b[33mDescription:\u001b[39m   A basic command without arguments or options.',
        '',
        '',
      ].join('\n');
      expect(io.getOutput()).toBe(expected);
    });

    it('should return the help text for a command with one argument', async () => {
      const help = new Help(
        new Command({
          name: 'Basic Command',
          cmd: 'basic',
          usage: 'basic command',
          summary: 'a basic command',
          description: 'A basic command with arguments.',
          arguments: [
            {
              name: 'arg1',
              description: 'This is the description of the argument arg1',
            },
          ],
        })
      );
      const io = mockCommandIO();
      await help.write(io);
      const expected = [
        '',
        '         \u001b[33mUsage:\u001b[39m   basic command',
        '',
        '   \u001b[33mDescription:\u001b[39m   A basic command with arguments.',
        '',
        '     \u001b[33mArguments:\u001b[39m',
        '',
        '           \u001b[3m\u001b[1marg1\u001b[22m\u001b[23m   This is the description of the argument arg1',
        '                                                                      \u001b[2m[required]\u001b[22m',
        '',
        " \u001b[3m\u001b[2m• Arguments may also be set via flags by prefixing the argument name with '--'." +
          '\u001b[22m\u001b[23m',
        '',
        '',
      ].join('\n');
      expect(io.getOutput()).toBe(expected);
    });

    it('should return the help text for a command with many arguments', async () => {
      const help = new Help(
        new Command({
          name: 'Basic Command',
          cmd: 'basic',
          usage: 'basic command',
          summary: 'a basic command',
          description: 'A basic command with arguments.',
          arguments: [
            {
              name: 'arg1',
              description: 'This short description',
            },
            {
              name: 'arg2',
              description: [
                'This is the description of the argument arg2.',
                'It is a much longer description that should wrap over a few',
                'lines because of its length. It is important that it wraps in',
                'an attractive manner.',
              ].join(' '),
            },
            {
              name: 'arg3',
              description: 'This is the description of the argument arg3',
            },
          ],
        })
      );
      const io = mockCommandIO();
      await help.write(io);
      const expected = [
        '',
        '         \u001b[33mUsage:\u001b[39m   basic command',
        '',
        '   \u001b[33mDescription:\u001b[39m   A basic command with arguments.',
        '',
        '     \u001b[33mArguments:\u001b[39m',
        '',
        '           \u001b[3m\u001b[1marg1\u001b[22m\u001b[23m   This short description',
        '                                                                      \u001b[2m[required]\u001b[22m',
        '',
        '           \u001b[3m\u001b[1marg2\u001b[22m\u001b[23m   This is the description of the argument arg2.' +
          ' It is a much',
        '                  longer description that should wrap over a few lines because',
        '                  of its length. It is important that it wraps in an attractive',
        '                  manner.',
        '                                                                      \u001b[2m[required]\u001b[22m',
        '',
        '           \u001b[3m\u001b[1marg3\u001b[22m\u001b[23m   This is the description of the argument arg3',
        '                                                                      \u001b[2m[required]\u001b[22m',
        '',
        " \u001b[3m\u001b[2m• Arguments may also be set via flags by prefixing the argument name with '--'." +
          '\u001b[22m\u001b[23m',
        '',
        '',
      ].join('\n');
      expect(io.getOutput()).toBe(expected);
    });

    it('should return the help text for a command with many arguments with non-string types', async () => {
      const help = new Help(
        new Command({
          name: 'Basic Command',
          cmd: 'basic',
          usage: 'basic command',
          summary: 'a basic command',
          description: 'A basic command with arguments.',
          arguments: [
            {
              name: 'arg1',
              description: 'This short description',
              type: ArgType.integer,
            },
            {
              name: 'arg2',
              description: [
                'This is the description of the argument arg2.',
                'It is a much longer description that should wrap over a few',
                'lines because of its length. It is important that it wraps in',
                'an attractive manner.',
              ].join(' '),
              type: ArgType.boolean,
            },
            {
              name: 'arg3',
              description: 'This is the description of the argument arg3',
              type: ArgType.string,
            },
          ],
        })
      );
      const io = mockCommandIO();
      await help.write(io);
      const expected = [
        '',
        '         \u001b[33mUsage:\u001b[39m   basic command',
        '',
        '   \u001b[33mDescription:\u001b[39m   A basic command with arguments.',
        '',
        '     \u001b[33mArguments:\u001b[39m',
        '',
        '           \u001b[3m\u001b[1marg1\u001b[22m\u001b[23m   This short description',
        '                                                            \u001b[2m[required] [integer]\u001b[22m',
        '',
        '           \u001b[3m\u001b[1marg2\u001b[22m\u001b[23m   This is the description of the argument arg2.' +
          ' It is a much',
        '                  longer description that should wrap over a few lines because',
        '                  of its length. It is important that it wraps in an attractive',
        '                  manner.',
        '                                                            \u001b[2m[required] [boolean]\u001b[22m',
        '',
        '           \u001b[3m\u001b[1marg3\u001b[22m\u001b[23m   This is the description of the argument arg3',
        '                                                                      \u001b[2m[required]\u001b[22m',
        '',
        " \u001b[3m\u001b[2m• Arguments may also be set via flags by prefixing the argument name with '--'." +
          '\u001b[22m\u001b[23m',
        '',
        '',
      ].join('\n');
      expect(io.getOutput()).toBe(expected);
    });

    it('should return the help text for a command with many arguments with non-string types', async () => {
      const help = new Help(
        new Command({
          name: 'Basic Command',
          cmd: 'basic',
          usage: 'basic command',
          summary: 'a basic command',
          description: 'A basic command with arguments.',
          arguments: [
            {
              name: 'arg1',
              description: 'This short description',
              type: ArgType.integer,
            },
            {
              name: 'arg2',
              description: [
                'This is the description of the argument arg2.',
                'It is a much longer description that should wrap over a few',
                'lines because of its length. It is important that it wraps in',
                'an attractive manner.',
              ].join(' '),
              type: ArgType.boolean,
            },
            {
              name: 'arg3',
              description: 'This is the description of the argument arg3',
              type: ArgType.string,
            },
          ],
        })
      );
      const io = mockCommandIO();
      await help.write(io);
      const expected = [
        '',
        '         \u001b[33mUsage:\u001b[39m   basic command',
        '',
        '   \u001b[33mDescription:\u001b[39m   A basic command with arguments.',
        '',
        '     \u001b[33mArguments:\u001b[39m',
        '',
        '           \u001b[3m\u001b[1marg1\u001b[22m\u001b[23m   This short description',
        '                                                            \u001b[2m[required] [integer]\u001b[22m',
        '',
        '           \u001b[3m\u001b[1marg2\u001b[22m\u001b[23m   This is the description of the argument arg2.' +
          ' It is a much',
        '                  longer description that should wrap over a few lines because',
        '                  of its length. It is important that it wraps in an attractive',
        '                  manner.',
        '                                                            \u001b[2m[required] [boolean]\u001b[22m',
        '',
        '           \u001b[3m\u001b[1marg3\u001b[22m\u001b[23m   This is the description of the argument arg3',
        '                                                                      \u001b[2m[required]\u001b[22m',
        '',
        " \u001b[3m\u001b[2m• Arguments may also be set via flags by prefixing the argument name with '--'." +
          '\u001b[22m\u001b[23m',
        '',
        '',
      ].join('\n');

      expect(io.getOutput()).toBe(expected);
    });

    it('should return the help text for a command with one option', async () => {
      const help = new Help(
        new Command({
          name: 'Basic Command',
          cmd: 'basic',
          usage: 'basic command',
          summary: 'a basic command',
          description: 'A basic command with arguments.',
          options: [
            {
              name: 'option1',
              description: 'This is the description of option1',
            },
          ],
        })
      );
      const io = mockCommandIO();
      await help.write(io);
      const expected = [
        '',
        '         \u001b[33mUsage:\u001b[39m   basic command',
        '',
        '   \u001b[33mDescription:\u001b[39m   A basic command with arguments.',
        '',
        '       \u001b[33mOptions:\u001b[39m',
        '',
        '      --\u001b[1moption1\u001b[22m   This is the description of option1',
        '',
        '',
        '',
      ].join('\n');
      expect(io.getOutput()).toBe(expected);
    });

    it('should return the help text for a command with many options', async () => {
      const help = new Help(
        new Command({
          name: 'Basic Command',
          cmd: 'basic',
          usage: 'basic command',
          summary: 'a basic command',
          description: 'A basic command with arguments.',
          options: [
            {
              name: 'option1',
              description: 'This is the description of option1',
            },
            {
              name: 'option2',
              aliases: ['o'],
              description: 'This is the description of option2. The option also has a single alias value.',
            },
            {
              name: 'option3',
              aliases: ['op3', '3'],
              description: 'This is the description of option3. The option also has multiple alias values.',
            },
          ],
        })
      );
      const io = mockCommandIO();
      await help.write(io);
      const expected = [
        '',
        '               \u001b[33mUsage:\u001b[39m   basic command',
        '',
        '         \u001b[33mDescription:\u001b[39m   A basic command with arguments.',
        '',
        '             \u001b[33mOptions:\u001b[39m',
        '',
        '            --\u001b[1moption1\u001b[22m   This is the description of option1',
        '',
        '',
        '         --\u001b[1moption2\u001b[22m -o   This is the description of option2. The option also has',
        '                        a single alias value.',
        '',
        '',
        '   --\u001b[1moption3\u001b[22m --op3 -3   This is the description of option3. The option also has',
        '                        multiple alias values.',
        '',
        '',
        '',
      ].join('\n');
      expect(io.getOutput()).toBe(expected);
    });

    it('should return the help text for a command with options with properties', async () => {
      const help = new Help(
        new Command({
          name: 'Basic Command',
          cmd: 'basic',
          usage: 'basic command',
          summary: 'a basic command',
          description: 'A basic command with arguments.',
          options: [
            {
              name: 'option1',
              description: 'This is the description of option1',
            },
            {
              name: 'option2',
              description: 'This is the description of option2.',
              type: ArgType.boolean,
            },
            {
              name: 'option3',
              type: ArgType.integer,
              default: '5',
              allowMany: true,
              description: [
                'This is the description of option3.',
                'The option also has a longer description',
                'that should wrap nicely.',
              ].join(' '),
            },
          ],
        })
      );
      const io = mockCommandIO();
      await help.write(io);
      const expected = [
        '',
        '         \u001b[33mUsage:\u001b[39m   basic command',
        '',
        '   \u001b[33mDescription:\u001b[39m   A basic command with arguments.',
        '',
        '       \u001b[33mOptions:\u001b[39m',
        '',
        '      --\u001b[1moption1\u001b[22m   This is the description of option1',
        '',
        '',
        '      --\u001b[1moption2\u001b[22m   This is the description of option2.',
        '                                                                       \u001b[2m[boolean]\u001b[22m',
        '',
        '      --\u001b[1moption3\u001b[22m   This is the description of option3. The option also has a',
        '                  longer description that should wrap nicely.',
        '                                           \u001b[2m[integer] [default: 5] [multi-valued]\u001b[22m',
        '',
        '',
      ].join('\n');
      expect(io.getOutput()).toBe(expected);
    });

    it('should return the help text for a command with docs url', async () => {
      const help = new Help(
        new Command({
          name: 'Basic Command',
          cmd: 'basic',
          usage: 'basic command',
          summary: 'a basic command',
          description: 'A basic command with arguments.',
          docsUrl: 'https://mydocs',
        })
      );
      const io = mockCommandIO();
      await help.write(io);
      const expected = [
        '',
        '         \u001b[33mUsage:\u001b[39m   basic command',
        '',
        '   \u001b[33mDescription:\u001b[39m   A basic command with arguments.',
        '',
        ' \u001b[3m\u001b[2m• Visit https://mydocs for general documentation.\u001b[22m\u001b[23m',
        '',
        '',
      ].join('\n');
      expect(io.getOutput()).toBe(expected);
    });
  });
});
