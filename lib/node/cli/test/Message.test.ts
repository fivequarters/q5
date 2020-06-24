import { IText, Text } from '@5qtrs/text';
import { EOL } from 'os';
import { Message, MessageKind } from '../src';

// ------------
// Test Helpers
// ------------

function captureText(helpText: string) {
  const withColorCodes = JSON.stringify(helpText);
  const withoutQuotes = withColorCodes.substring(1, withColorCodes.length - 1);
  const wrapped = withoutQuotes.split('\\n').map((text) => `        "${text}",`);
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

describe('Message', () => {
  describe('create()', () => {
    it('should return an instance of Message', async () => {
      const message = await Message.create({ message: 'A Message' });
      expect(message).toBeInstanceOf(Message);
    });
  });

  describe('write()', () => {
    it('should return write out the message without a header', async () => {
      const message = await Message.create({ message: 'A Message' });
      const io = mockCommandIO();
      await message.write(io);
      const expected = ['', '   A Message', '', ''].join('\n');
      expect(io.getOutput()).toBe(expected);
    });

    it('should wrap the message without a header', async () => {
      const fullMessage = [
        'This is a message with a length that is greater than',
        'the output width and so it should wrap.',
      ].join(' ');
      const message = await Message.create({ message: fullMessage });
      const io = mockCommandIO();
      io.outputWidth = 30;
      await message.write(io);
      const expected = [
        '',
        '   This is a message with a',
        '   length that is greater than',
        '   the output width and so it',
        '   should wrap.',
        '',
        '',
      ].join('\n');
      expect(io.getOutput()).toBe(expected);
    });

    it('should include a green header if set', async () => {
      const message = await Message.create({ message: 'A Message', header: 'A Header:' });
      const io = mockCommandIO();
      io.outputWidth = 30;
      await message.write(io);

      const expected = ['', '   \u001b[32mA Header:\u001b[39m   A Message', '', ''].join('\n');
      expect(io.getOutput()).toBe(expected);
    });

    it('should set the header color red for error messages', async () => {
      const message = await Message.create({ message: 'A Message', header: 'A Header:', kind: MessageKind.error });
      const io = mockCommandIO();
      io.outputWidth = 30;
      await message.write(io);
      const expected = ['', '   \u001b[31mA Header:\u001b[39m   A Message', '', ''].join('\n');
      expect(io.getOutput()).toBe(expected);
    });

    it('should set the header color yellow for warning messages', async () => {
      const message = await Message.create({ message: 'A Message', header: 'A Header:', kind: MessageKind.warning });
      const io = mockCommandIO();
      io.outputWidth = 30;
      await message.write(io);
      const expected = ['', '   \u001b[33mA Header:\u001b[39m   A Message', '', ''].join('\n');
      expect(io.getOutput()).toBe(expected);
    });

    it('should set the header color green for result messages', async () => {
      const message = await Message.create({ message: 'A Message', header: 'A Header:', kind: MessageKind.result });
      const io = mockCommandIO();
      io.outputWidth = 30;
      await message.write(io);
      const expected = ['', '   \u001b[32mA Header:\u001b[39m   A Message', '', ''].join('\n');
      expect(io.getOutput()).toBe(expected);
    });

    it('should set the header color blue for info messages', async () => {
      const message = await Message.create({ message: 'A Message', header: 'A Header:', kind: MessageKind.info });
      const io = mockCommandIO();
      io.outputWidth = 30;
      await message.write(io);
      const expected = ['', '   \u001b[34mA Header:\u001b[39m   A Message', '', ''].join('\n');
      expect(io.getOutput()).toBe(expected);
    });

    it('should accept the header that is a Text instance', async () => {
      const message = await Message.create({ message: 'A Message', header: Text.bold('A Header:') });
      const io = mockCommandIO();
      io.outputWidth = 30;
      await message.write(io);
      const expected = ['', '   \u001b[1mA Header:\u001b[22m   A Message', '', ''].join('\n');
      expect(io.getOutput()).toBe(expected);
    });
  });
});
