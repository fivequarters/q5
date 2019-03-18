import { IText, Text } from '@5qtrs/text';
import { EOL } from 'os';
import { ArgType, Command, IExecuteInput } from '../src';

// ------------
// Test Helpers
// ------------

function captureText(helpText: string) {
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

class TestCommand extends Command {
  public lastInput?: IExecuteInput;
  public nextOnExecuteResult?: number;

  protected async onExecute(input: IExecuteInput): Promise<number> {
    this.lastInput = input;
    return this.nextOnExecuteResult || 999;
  }
}

// -----
// Tests
// -----

describe('Command', () => {
  describe('execute()', () => {
    it('should execute the command without arguments or options', async () => {
      const command = new TestCommand({ name: 'Command Name' });
      const io = mockCommandIO();
      const result = await command.execute([], io);
      expect(result).toBe(999);
      expect(command.lastInput).toBeDefined();
      if (command.lastInput) {
        expect(command.lastInput.terms).toEqual([]);
        expect(command.lastInput.arguments).toEqual([]);
        expect(command.lastInput.options).toEqual({});
      }
    });

    it('should execute the command with correct argument types', async () => {
      const command = new TestCommand({
        name: 'Command Name',
        arguments: [
          {
            name: 'arg1',
            type: ArgType.integer,
          },
          {
            name: 'arg2',
            type: ArgType.float,
          },
          {
            name: 'arg3',
            type: ArgType.boolean,
          },
          {
            name: 'arg4',
            type: ArgType.string,
          },
        ],
      });
      const io = mockCommandIO();
      const result = await command.execute(['235', '54.34', 'false', 'hello'], io);
      expect(result).toBe(999);
      expect(command.lastInput).toBeDefined();
      if (command.lastInput) {
        expect(command.lastInput.terms).toEqual([]);
        expect(command.lastInput.arguments).toEqual([235, 54.34, false, 'hello']);
        expect(command.lastInput.options).toEqual({});
      }
    });

    it('should execute the command with correct default arguments', async () => {
      const command = new TestCommand({
        name: 'Command Name',
        arguments: [
          {
            name: 'arg1',
            type: ArgType.integer,
            default: '5',
          },
          {
            name: 'arg2',
            type: ArgType.float,
            default: '1.5',
          },
          {
            name: 'arg3',
            type: ArgType.boolean,
            default: 'true',
          },
          {
            name: 'arg4',
            type: ArgType.string,
            default: 'yo',
          },
        ],
      });
      const io = mockCommandIO();
      const result = await command.execute([], io);
      expect(result).toBe(999);
      expect(command.lastInput).toBeDefined();
      if (command.lastInput) {
        expect(command.lastInput.terms).toEqual([]);
        expect(command.lastInput.arguments).toEqual([5, 1.5, true, 'yo']);
        expect(command.lastInput.options).toEqual({});
      }
    });

    it('should execute the command with arguments given as options', async () => {
      const command = new TestCommand({
        name: 'Command Name',
        arguments: [
          {
            name: 'arg1',
            type: ArgType.integer,
          },
          {
            name: 'arg2',
            type: ArgType.float,
          },
          {
            name: 'arg3',
            type: ArgType.boolean,
          },
          {
            name: 'arg4',
            type: ArgType.string,
          },
        ],
      });
      const io = mockCommandIO();
      const result = await command.execute(['5', 'true', '--arg2', '1.5', 'yo'], io);
      expect(result).toBe(999);
      expect(command.lastInput).toBeDefined();
      if (command.lastInput) {
        expect(command.lastInput.terms).toEqual([]);
        expect(command.lastInput.arguments).toEqual([5, 1.5, true, 'yo']);
        expect(command.lastInput.options).toEqual({});
      }
    });

    it('should execute the command with correct option types', async () => {
      const command = new TestCommand({
        name: 'Command Name',
        options: [
          {
            name: 'opt1',
            type: ArgType.integer,
          },
          {
            name: 'opt2',
            type: ArgType.float,
          },
          {
            name: 'opt3',
            type: ArgType.boolean,
          },
          {
            name: 'opt4',
            type: ArgType.string,
          },
        ],
      });
      const io = mockCommandIO();
      const result = await command.execute(['--opt1=5', '--opt3:true', '--opt2', '1.5', '--opt4', 'yo'], io);
      expect(result).toBe(999);
      expect(command.lastInput).toBeDefined();
      if (command.lastInput) {
        expect(command.lastInput.terms).toEqual([]);
        expect(command.lastInput.arguments).toEqual([]);
        expect(command.lastInput.options).toEqual({ opt1: 5, opt2: 1.5, opt3: true, opt4: 'yo' });
      }
    });

    it('should execute the command with multiple option values', async () => {
      const command = new TestCommand({
        name: 'Command Name',
        options: [
          {
            name: 'opt1',
            type: ArgType.integer,
            allowMany: true,
          },
          {
            name: 'opt2',
            type: ArgType.float,
            allowMany: true,
          },
        ],
      });
      const io = mockCommandIO();
      const result = await command.execute(['--opt1=5', '--opt2:1.5', '--opt1', '3', '--opt1', '6'], io);
      expect(result).toBe(999);
      expect(command.lastInput).toBeDefined();
      if (command.lastInput) {
        expect(command.lastInput.terms).toEqual([]);
        expect(command.lastInput.arguments).toEqual([]);
        expect(command.lastInput.options).toEqual({ opt1: [5, 3, 6], opt2: [1.5] });
      }
    });

    it('should execute the command with correct option aliases', async () => {
      const command = new TestCommand({
        name: 'Command Name',
        options: [
          {
            name: 'opt1',
            type: ArgType.integer,
            aliases: ['1', 'o1'],
          },
          {
            name: 'opt2',
            type: ArgType.float,
            aliases: ['2', 'o2'],
          },
        ],
      });
      const io = mockCommandIO();
      const result = await command.execute(['-1=5', '--o2', '1.5'], io);
      expect(result).toBe(999);
      expect(command.lastInput).toBeDefined();
      if (command.lastInput) {
        expect(command.lastInput.terms).toEqual([]);
        expect(command.lastInput.arguments).toEqual([]);
        expect(command.lastInput.options).toEqual({ opt1: 5, opt2: 1.5 });
      }
    });
  });

  describe('name', () => {
    it('should return the name of the command', () => {
      const command = new Command({ name: 'abc' });
      expect(command.name).toBe('abc');
    });
    it('should be immutable', () => {
      const values = { name: 'abc' };
      const command = new Command(values);
      values.name = 'not abc';
      expect(command.name).toBe('abc');
    });
  });

  describe('cmd', () => {
    it('should return the cmd of the command', () => {
      const command = new Command({ name: 'abc', cmd: 'foo' });
      expect(command.cmd).toBe('foo');
    });
    it('should be immutable', () => {
      const values = { name: 'abc', cmd: 'foo' };
      const command = new Command(values);
      values.cmd = 'not foo';
      expect(command.cmd).toBe('foo');
    });
  });

  describe('usage', () => {
    it('should return the usage of the command', () => {
      const command = new Command({ name: 'abc', usage: 'foo' });
      expect(command.usage.toString()).toBe('foo');
    });
    it('should be immutable', () => {
      const values = { name: 'abc', usage: 'foo' };
      const command = new Command(values);
      values.usage = 'not foo';
      expect(command.usage.toString()).toBe('foo');
    });
  });

  describe('terms', () => {
    it('should return the cmd of the command', () => {
      const command = new Command({ name: 'abc', cmd: 'foo' });
      expect(command.terms).toEqual(['foo']);
    });
    it('should be immutable', () => {
      const values = { name: 'abc', cmd: 'foo' };
      const command = new Command(values);
      values.cmd = 'not foo';
      command.terms.push('bar');
      expect(command.terms).toEqual(['foo']);
    });
    it('should be inherited from parent commands', () => {
      const command = new Command({ name: 'abc', cmd: 'foo' });
      const parent = new Command({ name: 'parent', subCommands: [command], cmd: 'bar' });
      expect(command.terms).toEqual(['bar', 'foo']);
    });
  });

  describe('description', () => {
    it('should return the description', () => {
      const command = new Command({ name: 'abc', description: 'foo' });
      expect(command.description.toString()).toBe('foo');
    });
    it('should return empty string by default', () => {
      const command = new Command({ name: 'abc' });
      expect(command.description.toString()).toBe('');
    });
    it('should be immutable', () => {
      const values = { name: 'abc', description: 'foo' };
      const command = new Command(values);
      values.description = 'bar';
      expect(command.description.toString()).toBe('foo');
    });
  });

  describe('summary', () => {
    it('should return the summary', () => {
      const command = new Command({ name: 'abc', summary: 'foo' });
      expect(command.summary.toString()).toBe('foo');
    });
    it('should return empty string by default', () => {
      const command = new Command({ name: 'abc' });
      expect(command.summary.toString()).toBe('');
    });
    it('should be immutable', () => {
      const values = { name: 'abc', summary: 'foo' };
      const command = new Command(values);
      values.summary = 'bar';
      expect(command.summary.toString()).toBe('foo');
    });
  });

  describe('options', () => {
    it('should return the options', () => {
      const command = new Command({ name: 'abc', options: [{ name: 'foo' }, { name: 'baz' }] });
      const actual = command.options.map(option => option.name);
      const expected = ['foo', 'baz'];
      expect(actual).toEqual(expected);
    });
    it('should return empty array by default', () => {
      const command = new Command({ name: 'abc' });
      expect(command.options).toEqual([]);
    });
    it('should be immutable', () => {
      const values = { name: 'abc', options: [{ name: 'foo' }, { name: 'baz' }] };
      const command = new Command(values);
      values.options = [{ name: 'foo' }];
      const actual = command.options.map(option => option.name);
      const expected = ['foo', 'baz'];
      expect(actual).toEqual(expected);
    });
    it('should be inherited from parent commands', () => {
      const command = new Command({ name: 'abc', options: [{ name: 'foo' }, { name: 'baz' }] });
      const parent = new Command({ name: 'parent', subCommands: [command], options: [{ name: 'bar' }] });
      const actual = command.options.map(option => option.name);
      const expected = ['bar', 'foo', 'baz'];
      expect(actual).toEqual(expected);
    });
  });

  describe('arguments', () => {
    it('should return the arguments', () => {
      const command = new Command({ name: 'abc', arguments: [{ name: 'foo' }, { name: 'baz' }] });
      const actual = command.arguments.map(argument => argument.name);
      const expected = ['foo', 'baz'];
      expect(actual).toEqual(expected);
    });
    it('should return empty array by default', () => {
      const command = new Command({ name: 'abc' });
      expect(command.arguments).toEqual([]);
    });
    it('should be immutable', () => {
      const values = { name: 'abc', arguments: [{ name: 'foo' }, { name: 'baz' }] };
      const command = new Command(values);
      values.arguments = [{ name: 'foo' }];
      const actual = command.arguments.map(argument => argument.name);
      const expected = ['foo', 'baz'];
      expect(actual).toEqual(expected);
    });
    it('should be inherited from parent commands', () => {
      const command = new Command({ name: 'abc', arguments: [{ name: 'foo' }, { name: 'baz' }] });
      const parent = new Command({ name: 'parent', subCommands: [command], arguments: [{ name: 'bar' }] });
      const actual = command.arguments.map(argument => argument.name);
      const expected = ['bar', 'foo', 'baz'];
      expect(actual).toEqual(expected);
    });
  });

  describe('modes', () => {
    it('should return the modes', () => {
      const command = new Command({ name: 'abc', modes: ['foo', 'baz'] });
      expect(command.modes).toEqual(['foo', 'baz']);
    });
    it('should return empty array by default', () => {
      const command = new Command({ name: 'abc' });
      expect(command.modes).toEqual([]);
    });
    it('should be immutable', () => {
      const values = { name: 'abc', modes: ['foo', 'baz'] };
      const command = new Command(values);
      values.modes = ['foo'];
      expect(command.modes).toEqual(['foo', 'baz']);
    });
    it('should over ride parent if set', () => {
      const command = new Command({ name: 'abc', modes: ['foo'] });
      const parent = new Command({ name: 'parent', subCommands: [command], modes: ['bar'] });
      expect(command.modes).toEqual(['foo']);
    });
    it('should be inherited from parent commands', () => {
      const command = new Command({ name: 'abc' });
      const parent = new Command({ name: 'parent', subCommands: [command], modes: ['bar'] });
      expect(command.modes).toEqual(['bar']);
    });
  });

  describe('subCommands', () => {
    it('should return only subCommands', () => {
      const command1 = new Command({ name: 'abc' });
      const command2 = new Command({ name: 'xyz' });
      const command3 = new Command({ name: 'qrs' });
      const command4 = new Command({ name: 'lmn' });
      const parent1 = new Command({ name: 'parent1', subCommands: [command1, command2] });
      const parent2 = new Command({ name: 'parent2', subCommands: [command3, command4] });
      const cli = new Command({ name: 'cli', subCommands: [parent1, parent2] });
      const actual = cli.subCommands.map(cmd => cmd.name);
      const expected = [parent1, parent2].map(cmd => cmd.name);
      expect(actual).toEqual(expected);
    });
    it('should return empty string by default', () => {
      const command = new Command({ name: 'abc' });
      expect(command.subCommands).toEqual([]);
    });
    it('should be immutable', () => {
      const command1 = new Command({ name: 'abc' });
      const command2 = new Command({ name: 'xyz' });
      const values = { name: 'parent1', subCommands: [command1, command2] };
      const parent = new Command(values);
      values.subCommands = [command1];
      const actual = parent.subCommands.map(cmd => cmd.name);
      const expected = [command1, command2].map(cmd => cmd.name);
      expect(actual).toEqual(expected);
    });
  });

  describe('allSubCommands', () => {
    it('should return the descendants', () => {
      const command1 = new Command({ name: 'abc' });
      const command2 = new Command({ name: 'xyz' });
      const command3 = new Command({ name: 'qrs' });
      const command4 = new Command({ name: 'lmn' });
      const parent1 = new Command({ name: 'parent1', subCommands: [command1, command2] });
      const parent2 = new Command({ name: 'parent2', subCommands: [command3, command4] });
      const cli = new Command({ name: 'cli', subCommands: [parent1, parent2] });
      const actual = cli.allSubCommands.map(cmd => cmd.name);
      const expected = [parent1, command1, command2, parent2, command3, command4].map(cmd => cmd.name);
      expect(actual).toEqual(expected);
    });
  });

  describe('docsUrl', () => {
    it('should return the docsUrl', () => {
      const command = new Command({ name: 'abc', docsUrl: 'foo' });
      expect(command.docsUrl).toBe('foo');
    });
    it('should return empty string by default', () => {
      const command = new Command({ name: 'abc' });
      expect(command.docsUrl).toBe('');
    });
    it('should be immutable', () => {
      const values = { name: 'abc', docsUrl: 'foo' };
      const command = new Command(values);
      values.docsUrl = 'bar';
      expect(command.docsUrl).toBe('foo');
    });
    it('should be inherited from parent commands', () => {
      const command = new Command({ name: 'abc' });
      const parent = new Command({ name: 'parent', subCommands: [command], docsUrl: 'foo' });
      expect(command.docsUrl).toBe('foo');
    });
  });

  describe('cli', () => {
    it('should return the cli', () => {
      const command = new Command({ name: 'abc', cli: 'foo' });
      expect(command.cli).toBe('foo');
    });
    it('should return empty string by default', () => {
      const command = new Command({ name: 'abc' });
      expect(command.cli).toBe('');
    });
    it('should be immutable', () => {
      const values = { name: 'abc', cli: 'foo' };
      const command = new Command(values);
      values.cli = 'bar';
      expect(command.cli).toBe('foo');
    });
    it('should be inherited from parent commands', () => {
      const command = new Command({ name: 'abc' });
      const parent = new Command({ name: 'parent', subCommands: [command], cli: 'foo' });
      expect(command.cli).toBe('foo');
    });
  });
});
