import { Text } from '../src';

describe('Text', () => {
  describe('create()', () => {
    it('should return regular text', () => {
      const text = Text.create('hello');
      expect(text.toString()).toBe('hello');
    });

    it('should accept an array of strings', () => {
      const text = Text.create(['hello', ' ', 'world']);
      expect(text.toString()).toBe('hello world');
    });

    it('should accept an array of strings and other Text', () => {
      const text = Text.create(['hello', ' ', Text.create('world')]);
      expect(text.toString()).toBe('hello world');
    });
  });

  describe('wrap()', () => {
    it('should not wrap a string that is less than the width', () => {
      const text = Text.create('hello');
      const wrapped = text.wrap(10).map((line) => line.toString());
      expect(wrapped).toEqual(['hello']);
    });
    it('should not wrap a string that is less than the width when split by lines', () => {
      const text = Text.create('hello\nworld');
      const wrapped = text.wrap(10).map((line) => line.toString());
      expect(wrapped).toEqual(['hello', 'world']);
    });
    it('should wrap a line at the space', () => {
      const text = Text.create('hello world');
      const wrapped = text.wrap(10).map((line) => line.toString());
      expect(wrapped).toEqual(['hello', 'world']);
    });
    it('should wrap a line at the tab', () => {
      const text = Text.create('hello\tworld');
      const wrapped = text.wrap(10).map((line) => line.toString());
      expect(wrapped).toEqual(['hello', 'world']);
    });
    it('should wrap using the indent character provided', () => {
      const text = Text.create('hello world');
      const wrapped = text.wrap(10, '  ').map((line) => line.toString());
      expect(wrapped).toEqual(['hello', '  world']);
    });
    it('should wrap mulitple times correctly', () => {
      const text = Text.create('the quick brown fox jumped over the fence and ran away');
      const wrapped = text.wrap(20, '').map((line) => line.toString());
      expect(wrapped).toEqual(['the quick brown fox', 'jumped over the', 'fence and ran away']);
    });
    it('should hypenate if no whitespace is present', () => {
      const text = Text.create('ABCDEFGHIJKLMNOP');
      const wrapped = text.wrap(10, '').map((line) => line.toString());
      expect(wrapped).toEqual(['ABCDEFGHI-', 'JKLMNOP']);
    });
    it('should hypenate if no whitespace is present using the hypenate character', () => {
      const text = Text.create('ABCDEFGHIJKLMNOP');
      const wrapped = text.wrap(10, '', ' - ').map((line) => line.toString());
      expect(wrapped).toEqual(['ABCDEFG - ', 'HIJKLMNOP']);
    });
    it('should not add any extra empty lines', () => {
      const text = Text.create('hello ');
      const wrapped = text.wrap(5).map((line) => line.toString());
      expect(wrapped).toEqual(['hello']);
    });
    it('should wrap even with small values', () => {
      const text = Text.create('1 2 3 4 5');
      const wrapped = text.wrap(1).map((line) => line.toString());
      expect(wrapped).toEqual(['1', '2', '3', '4', '5']);
    });
  });

  describe('truncate()', () => {
    it('should not truncate a string that is less than the width', () => {
      const text = Text.create('hello');
      const truncated = text.truncate(10).map((line) => line.toString());
      expect(truncated).toEqual(['hello']);
    });
    it('should not truncate a string that is less than the width when split by lines', () => {
      const text = Text.create('hello\nworld');
      const truncated = text.truncate(10).map((line) => line.toString());
      expect(truncated).toEqual(['hello', 'world']);
    });
    it('should truncate a line at the space', () => {
      const text = Text.create('hello world');
      const truncated = text.truncate(10).map((line) => line.toString());
      expect(truncated).toEqual(['hello…']);
    });
    it('should truncate a line at the tab', () => {
      const text = Text.create('hello\tworld');
      const truncated = text.truncate(10).map((line) => line.toString());
      expect(truncated).toEqual(['hello…']);
    });
    it('should truncate using the elipsis character provided', () => {
      const text = Text.create('hello\tworld');
      const truncated = text.truncate(10, ' !').map((line) => line.toString());
      expect(truncated).toEqual(['hello !']);
    });
    it('should truncate even if no whitespace is present', () => {
      const text = Text.create('ABCDEFGHIJKLMNOP');
      const truncated = text.truncate(10).map((line) => line.toString());
      expect(truncated).toEqual(['ABCDEFGHI…']);
    });
    it('should truncate if no whitespace is present using the ellipsis character', () => {
      const text = Text.create('ABCDEFGHIJKLMNOP');
      const truncated = text.truncate(10, '-').map((line) => line.toString());
      expect(truncated).toEqual(['ABCDEFGHI-']);
    });
    it('should truncate even with small values', () => {
      const text = Text.create('1 2 3 4 5');
      const truncated = text.truncate(1).map((line) => line.toString());
      expect(truncated).toEqual(['1']);
    });
  });

  describe('substring()', () => {
    it('should correctly return a substring', () => {
      const text = Text.black('hello').substring(1, 4);
      expect(text.toString()).toBe('\u001b[30mell\u001b[39m');
    });
    it('should not return colored text if coloring is disabled', () => {
      const text = Text.black('hello').substring(1, 4);
      expect(text.toString(false)).toBe('ell');
    });
    it('should correctly return a substring with no end set', () => {
      const text = Text.black('hello').substring(1);
      expect(text.toString()).toBe('\u001b[30mello\u001b[39m');
    });
    it('should correctly return a substring with many segments', () => {
      const text = Text.black(['hello', ' ', 'world']).substring(3, 8);
      expect(text.toString()).toBe('\u001b[30mlo wo\u001b[39m');
    });
    it('should correctly return a substring with many segments and no end set', () => {
      const text = Text.black(['hello', ' ', 'world']).substring(3);
      expect(text.toString()).toBe('\u001b[30mlo world\u001b[39m');
    });
    it('should correctly return a substring that is a full segment', () => {
      const text = Text.black(['hello ', 'brave', ' world']).substring(6, 11);
      expect(text.toString()).toBe('\u001b[30mbrave\u001b[39m');
    });
    it('should correctly return a substring with nested Text', () => {
      const inner = Text.dim('<this should be dim>');
      const text = Text.black(['hello ', inner, ' world']).substring(6, 11);
      expect(text.toString()).toBe('\u001b[30m\u001b[2m<this\u001b[22m\u001b[39m');
    });
  });

  describe('split()', () => {
    it('should correctly split', () => {
      const text = Text.black('hello world');
      const split = text.split(' ').map((segment) => segment.toString());
      expect(split).toEqual(['\u001b[30mhello\u001b[39m', '\u001b[30mworld\u001b[39m']);
    });

    it('should correctly split across many segments', () => {
      const text = Text.black(['hello', ' ', 'brave', ' ', 'world']);
      const split = text.split(' ').map((segment) => segment.toString());
      expect(split).toEqual(['\u001b[30mhello\u001b[39m', '\u001b[30mbrave\u001b[39m', '\u001b[30mworld\u001b[39m']);
    });
  });

  describe('padLeft()', () => {
    it('should correctly pad', () => {
      const text = Text.black('hello').padLeft(10);
      expect(text.toString()).toBe('     \u001b[30mhello\u001b[39m');
    });

    it('should correctly pad across segments', () => {
      const text = Text.black('hello', Text.red('!')).padLeft(10);
      expect(text.toString()).toBe('    \u001b[30mhello\u001b[31m!\u001b[39m\u001b[39m');
    });
  });

  describe('padRight()', () => {
    it('should correctly pad', () => {
      const text = Text.black('hello').padRight(10);
      expect(text.toString()).toBe('\u001b[30mhello\u001b[39m     ');
    });
    it('should correctly pad across segments', () => {
      const text = Text.black('hello', Text.red('!')).padRight(10);
      expect(text.toString()).toBe('\u001b[30mhello\u001b[31m!\u001b[39m\u001b[39m    ');
    });
  });

  describe('pad()', () => {
    it('should correctly pad', () => {
      const text = Text.black('hello').pad(10);
      expect(text.toString()).toBe('  \u001b[30mhello\u001b[39m   ');
    });
    it('should correctly pad across segments', () => {
      const text = Text.black('hello', Text.red('!')).pad(10);
      expect(text.toString()).toBe('  \u001b[30mhello\u001b[31m!\u001b[39m\u001b[39m  ');
    });
  });

  describe('trimLeft()', () => {
    it('should correctly trim', () => {
      const text = Text.black('  \thello ').trimLeft();
      expect(text.toString()).toBe('\u001b[30mhello \u001b[39m');
    });
    it('should correctly trim across segments', () => {
      const text = Text.black('   hello', Text.red('! ')).trimLeft();
      expect(text.toString()).toBe('\u001b[30mhello\u001b[31m! \u001b[39m\u001b[39m');
    });
    it('should correctly trim entire segments', () => {
      const text = Text.black('   ', 'hello', Text.red('! ')).trimLeft();
      expect(text.toString()).toBe('\u001b[30mhello\u001b[31m! \u001b[39m\u001b[39m');
    });
    it('should correctly trim all segments', () => {
      const text = Text.black(' ', '  ', Text.red('   '), '   ').trimLeft();
      expect(text.toString()).toBe('');
    });
  });

  describe('trimRight()', () => {
    it('should correctly trim', () => {
      const text = Text.black(' hello  ').trimRight();
      expect(text.toString()).toBe('\u001b[30m hello\u001b[39m');
    });
    it('should correctly trim across segments', () => {
      const text = Text.black(' hello', Text.red('!   ')).trimRight();
      expect(text.toString()).toBe('\u001b[30m hello\u001b[31m!\u001b[39m\u001b[39m');
    });
    it('should correctly trim entire segments', () => {
      const text = Text.black(' ', ' hello', Text.red('!   '), '   ').trimRight();
      expect(text.toString()).toBe('\u001b[30m  hello\u001b[31m!\u001b[39m\u001b[39m');
    });
    it('should correctly trim all segments', () => {
      const text = Text.black(' ', '  ', Text.red('   '), '   ').trimRight();
      expect(text.toString()).toBe('');
    });
  });

  describe('trim()', () => {
    it('should correctly trim', () => {
      const text = Text.black('  hello  ').trim();
      expect(text.toString()).toBe('\u001b[30mhello\u001b[39m');
    });
    it('should correctly trim across segments', () => {
      const text = Text.black('  hello', Text.red('!  ')).trim();
      expect(text.toString()).toBe('\u001b[30mhello\u001b[31m!\u001b[39m\u001b[39m');
    });
    it('should correctly trim entire segments', () => {
      const text = Text.black('   ', '  hello', Text.red('!  '), '  ').trim();
      expect(text.toString()).toBe('\u001b[30mhello\u001b[31m!\u001b[39m\u001b[39m');
    });
    it('should correctly trim all segments', () => {
      const text = Text.black(' ', '  ', Text.red('   '), '   ').trim();
      expect(text.toString()).toBe('');
    });
  });

  describe('black()', () => {
    it('should return colored text', async () => {
      const text = await Text.black('hello');
      expect(text.toString()).toBe('\u001b[30mhello\u001b[39m');
    });
    it('should not return colored text if coloring is disabled', async () => {
      const text = await Text.black('hello');
      expect(text.toString(false)).toBe('hello');
    });
  });

  describe('red()', () => {
    it('should return colored text', async () => {
      const text = await Text.red('hello');
      expect(text.toString()).toBe('\u001b[31mhello\u001b[39m');
    });
    it('should not return colored text if coloring is disabled', async () => {
      const text = await Text.red('hello');
      expect(text.toString(false)).toBe('hello');
    });
  });

  describe('green()', () => {
    it('should return colored text', async () => {
      const text = await Text.green('hello');
      expect(text.toString()).toBe('\u001b[32mhello\u001b[39m');
    });
    it('should not return colored text if coloring is disabled', async () => {
      const text = await Text.green('hello');
      expect(text.toString(false)).toBe('hello');
    });
  });

  describe('yellow()', () => {
    it('should return colored text', async () => {
      const text = await Text.yellow('hello');
      expect(text.toString()).toBe('\u001b[33mhello\u001b[39m');
    });
    it('should not return colored text if coloring is disabled', async () => {
      const text = await Text.yellow('hello');
      expect(text.toString(false)).toBe('hello');
    });
  });

  describe('blue()', () => {
    it('should return colored text', async () => {
      const text = await Text.blue('hello');
      expect(text.toString()).toBe('\u001b[34mhello\u001b[39m');
    });
    it('should not return colored text if coloring is disabled', async () => {
      const text = await Text.blue('hello');
      expect(text.toString(false)).toBe('hello');
    });
  });

  describe('magenta()', () => {
    it('should return colored text', async () => {
      const text = await Text.magenta('hello');
      expect(text.toString()).toBe('\u001b[35mhello\u001b[39m');
    });
    it('should not return colored text if coloring is disabled', async () => {
      const text = await Text.magenta('hello');
      expect(text.toString(false)).toBe('hello');
    });
  });

  describe('cyan()', () => {
    it('should return colored text', async () => {
      const text = await Text.cyan('hello');
      expect(text.toString()).toBe('\u001b[36mhello\u001b[39m');
    });
    it('should not return colored text if coloring is disabled', async () => {
      const text = await Text.cyan('hello');
      expect(text.toString(false)).toBe('hello');
    });
  });

  describe('white()', () => {
    it('should return colored text', async () => {
      const text = await Text.white('hello');
      expect(text.toString()).toBe('\u001b[37mhello\u001b[39m');
    });
    it('should not return colored text if coloring is disabled', async () => {
      const text = await Text.white('hello');
      expect(text.toString(false)).toBe('hello');
    });
  });

  describe('gray()', () => {
    it('should return colored text', async () => {
      const text = await Text.gray('hello');
      expect(text.toString()).toBe('\u001b[90mhello\u001b[39m');
    });
    it('should not return colored text if coloring is disabled', async () => {
      const text = await Text.gray('hello');
      expect(text.toString(false)).toBe('hello');
    });
  });

  describe('grey()', () => {
    it('should return colored text', async () => {
      const text = await Text.grey('hello');
      expect(text.toString()).toBe('\u001b[90mhello\u001b[39m');
    });
    it('should not return colored text if coloring is disabled', async () => {
      const text = await Text.grey('hello');
      expect(text.toString(false)).toBe('hello');
    });
  });

  describe('bold()', () => {
    it('should return colored text', async () => {
      const text = await Text.bold('hello');
      expect(text.toString()).toBe('\u001b[1mhello\u001b[22m');
    });
    it('should not return colored text if coloring is disabled', async () => {
      const text = await Text.bold('hello');
      expect(text.toString(false)).toBe('hello');
    });
  });

  describe('dim()', () => {
    it('should return colored text', async () => {
      const text = await Text.dim('hello');
      expect(text.toString()).toBe('\u001b[2mhello\u001b[22m');
    });
    it('should not return colored text if coloring is disabled', async () => {
      const text = await Text.dim('hello');
      expect(text.toString(false)).toBe('hello');
    });
  });

  describe('italic()', () => {
    it('should return colored text', async () => {
      const text = await Text.italic('hello');
      expect(text.toString()).toBe('\u001b[3mhello\u001b[23m');
    });
    it('should not return colored text if coloring is disabled', async () => {
      const text = await Text.italic('hello');
      expect(text.toString(false)).toBe('hello');
    });
  });

  describe('underline()', () => {
    it('should return colored text', async () => {
      const text = await Text.underline('hello');
      expect(text.toString()).toBe('\u001b[4mhello\u001b[24m');
    });
    it('should not return colored text if coloring is disabled', async () => {
      const text = await Text.underline('hello');
      expect(text.toString(false)).toBe('hello');
    });
  });

  describe('inverse()', () => {
    it('should return colored text', async () => {
      const text = await Text.inverse('hello');
      expect(text.toString()).toBe('\u001b[7mhello\u001b[27m');
    });
    it('should not return colored text if coloring is disabled', async () => {
      const text = await Text.inverse('hello');
      expect(text.toString(false)).toBe('hello');
    });
  });

  describe('hidden()', () => {
    it('should return colored text', async () => {
      const text = await Text.hidden('hello');
      expect(text.toString()).toBe('\u001b[8mhello\u001b[28m');
    });
    it('should not return colored text if coloring is disabled', async () => {
      const text = await Text.hidden('hello');
      expect(text.toString(false)).toBe('hello');
    });
  });
});
