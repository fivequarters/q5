import { ConsoleColor } from '../src';

describe('ConsoleColor', () => {
  describe('constructor', () => {
    it('should return an instance', async () => {
      const color = await ConsoleColor.create();
      expect(color).toBeInstanceOf(ConsoleColor);
    });
  });

  describe('black', () => {
    it('should return colored text', async () => {
      const color = await ConsoleColor.create();
      const colored = color.black('hello');
      expect(colored).toBe('\u001b[30mhello\u001b[39m');
    });
    it('should not return colored text if coloring is disabled', async () => {
      const color = await ConsoleColor.create();
      color.disable();
      const colored = color.black('hello');
      expect(colored).toBe('hello');
    });
  });

  describe('red', () => {
    it('should return colored text', async () => {
      const color = await ConsoleColor.create();
      const colored = color.red('hello');
      expect(colored).toBe('\u001b[31mhello\u001b[39m');
    });
    it('should not return colored text if coloring is disabled', async () => {
      const color = await ConsoleColor.create();
      color.disable();
      const colored = color.red('hello');
      expect(colored).toBe('hello');
    });
  });

  describe('green', () => {
    it('should return colored text', async () => {
      const color = await ConsoleColor.create();
      const colored = color.green('hello');
      expect(colored).toBe('\u001b[32mhello\u001b[39m');
    });
    it('should not return colored text if coloring is disabled', async () => {
      const color = await ConsoleColor.create();
      color.disable();
      const colored = color.green('hello');
      expect(colored).toBe('hello');
    });
  });

  describe('yellow', () => {
    it('should return colored text', async () => {
      const color = await ConsoleColor.create();
      const colored = color.yellow('hello');
      expect(colored).toBe('\u001b[33mhello\u001b[39m');
    });
    it('should not return colored text if coloring is disabled', async () => {
      const color = await ConsoleColor.create();
      color.disable();
      const colored = color.yellow('hello');
      expect(colored).toBe('hello');
    });
  });

  describe('blue', () => {
    it('should return colored text', async () => {
      const color = await ConsoleColor.create();
      const colored = color.blue('hello');
      expect(colored).toBe('\u001b[34mhello\u001b[39m');
    });
    it('should not return colored text if coloring is disabled', async () => {
      const color = await ConsoleColor.create();
      color.disable();
      const colored = color.blue('hello');
      expect(colored).toBe('hello');
    });
  });

  describe('magenta', () => {
    it('should return colored text', async () => {
      const color = await ConsoleColor.create();
      const colored = color.magenta('hello');
      expect(colored).toBe('\u001b[35mhello\u001b[39m');
    });
    it('should not return colored text if coloring is disabled', async () => {
      const color = await ConsoleColor.create();
      color.disable();
      const colored = color.magenta('hello');
      expect(colored).toBe('hello');
    });
  });

  describe('cyan', () => {
    it('should return colored text', async () => {
      const color = await ConsoleColor.create();
      const colored = color.cyan('hello');
      expect(colored).toBe('\u001b[36mhello\u001b[39m');
    });
    it('should not return colored text if coloring is disabled', async () => {
      const color = await ConsoleColor.create();
      color.disable();
      const colored = color.cyan('hello');
      expect(colored).toBe('hello');
    });
  });

  describe('white', () => {
    it('should return colored text', async () => {
      const color = await ConsoleColor.create();
      const colored = color.white('hello');
      expect(colored).toBe('\u001b[37mhello\u001b[39m');
    });
    it('should not return colored text if coloring is disabled', async () => {
      const color = await ConsoleColor.create();
      color.disable();
      const colored = color.white('hello');
      expect(colored).toBe('hello');
    });
  });

  describe('gray', () => {
    it('should return colored text', async () => {
      const color = await ConsoleColor.create();
      const colored = color.gray('hello');
      expect(colored).toBe('\u001b[90mhello\u001b[39m');
    });
    it('should not return colored text if coloring is disabled', async () => {
      const color = await ConsoleColor.create();
      color.disable();
      const colored = color.gray('hello');
      expect(colored).toBe('hello');
    });
  });

  describe('grey', () => {
    it('should return colored text', async () => {
      const color = await ConsoleColor.create();
      const colored = color.grey('hello');
      expect(colored).toBe('\u001b[90mhello\u001b[39m');
    });
    it('should not return colored text if coloring is disabled', async () => {
      const color = await ConsoleColor.create();
      color.disable();
      const colored = color.grey('hello');
      expect(colored).toBe('hello');
    });
  });

  describe('bold', () => {
    it('should return colored text', async () => {
      const color = await ConsoleColor.create();
      const colored = color.bold('hello');
      expect(colored).toBe('\u001b[1mhello\u001b[22m');
    });
    it('should not return colored text if coloring is disabled', async () => {
      const color = await ConsoleColor.create();
      color.disable();
      const colored = color.bold('hello');
      expect(colored).toBe('hello');
    });
  });

  describe('dim', () => {
    it('should return colored text', async () => {
      const color = await ConsoleColor.create();
      const colored = color.dim('hello');
      expect(colored).toBe('\u001b[2mhello\u001b[22m');
    });
    it('should not return colored text if coloring is disabled', async () => {
      const color = await ConsoleColor.create();
      color.disable();
      const colored = color.dim('hello');
      expect(colored).toBe('hello');
    });
  });

  describe('italic', () => {
    it('should return colored text', async () => {
      const color = await ConsoleColor.create();
      const colored = color.italic('hello');
      expect(colored).toBe('\u001b[3mhello\u001b[23m');
    });
    it('should not return colored text if coloring is disabled', async () => {
      const color = await ConsoleColor.create();
      color.disable();
      const colored = color.italic('hello');
      expect(colored).toBe('hello');
    });
  });

  describe('underline', () => {
    it('should return colored text', async () => {
      const color = await ConsoleColor.create();
      const colored = color.underline('hello');
      expect(colored).toBe('\u001b[4mhello\u001b[24m');
    });
    it('should not return colored text if coloring is disabled', async () => {
      const color = await ConsoleColor.create();
      color.disable();
      const colored = color.underline('hello');
      expect(colored).toBe('hello');
    });
  });

  describe('inverse', () => {
    it('should return colored text', async () => {
      const color = await ConsoleColor.create();
      const colored = color.inverse('hello');
      expect(colored).toBe('\u001b[7mhello\u001b[27m');
    });
    it('should not return colored text if coloring is disabled', async () => {
      const color = await ConsoleColor.create();
      color.disable();
      const colored = color.inverse('hello');
      expect(colored).toBe('hello');
    });
  });

  describe('hidden', () => {
    it('should return colored text', async () => {
      const color = await ConsoleColor.create();
      const colored = color.hidden('hello');
      expect(colored).toBe('\u001b[8mhello\u001b[28m');
    });
    it('should not return colored text if coloring is disabled', async () => {
      const color = await ConsoleColor.create();
      color.disable();
      const colored = color.hidden('hello');
      expect(colored).toBe('hello');
    });
  });
});
