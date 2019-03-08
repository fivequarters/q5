import { CellAlignment, CellOverflow, format } from '../src';

describe('format', () => {
  it('should validate the number of values and number of cell widths match', () => {
    const values = [{ lines: ['hello'] }];
    let message = '';
    try {
      format(values, []);
    } catch (error) {
      message = error.message;
    }
    expect(message).toBe("The number of row values, '1', must be equal to the number of column width values, '0'");
  });

  it('should ensure that all cell heights are equal', () => {
    const values = [{ lines: ['1'] }, { lines: ['1', '2', '3'] }, { lines: ['1', '2'] }];
    const widths = [1, 1, 1];

    const formatted = format(values, widths);
    expect(formatted).toEqual([{ lines: ['1', ' ', ' '] }, { lines: ['1', '2', '3'] }, { lines: ['1', '2', ' '] }]);
  });

  it('should ensure that all cells are aligned left by default', () => {
    const values = [{ lines: ['1'] }, { lines: ['1', '2', '3'] }, { lines: ['1', '2'] }];
    const widths = [1, 3, 1];
    const formatted = format(values, widths);
    expect(formatted).toEqual([
      { lines: ['1', ' ', ' '] },
      { lines: ['1  ', '2  ', '3  '] },
      { lines: ['1', '2', ' '] },
    ]);
  });

  it('should aligned right if option is set', () => {
    const values = [{ lines: ['1'] }, { lines: ['1', '2', '3'] }, { lines: ['1', '2'] }];
    const constraint = { cells: [{}, { align: CellAlignment.right }] };
    const widths = [1, 3, 1];
    const formatted = format(values, widths, constraint);
    expect(formatted).toEqual([
      { lines: ['1', ' ', ' '] },
      { lines: ['  1', '  2', '  3'] },
      { lines: ['1', '2', ' '] },
    ]);
  });

  it('should aligned center if option is set', () => {
    const values = [{ lines: ['1'] }, { lines: ['1', '2', '3'] }, { lines: ['1', '2'] }];
    const constraint = { cells: [{}, { align: CellAlignment.center }] };
    const widths = [1, 3, 1];
    const formatted = format(values, widths, constraint);
    expect(formatted).toEqual([
      { lines: ['1', ' ', ' '] },
      { lines: [' 1 ', ' 2 ', ' 3 '] },
      { lines: ['1', '2', ' '] },
    ]);
  });

  it('should wrap by default', () => {
    const values = [{ lines: ['1 2 3 4 5'] }, { lines: ['1', '2', '3'] }, { lines: ['1', '2'] }];
    const widths = [1, 1, 1];
    const formatted = format(values, widths);
    expect(formatted).toEqual([
      { lines: ['1', '2', '3', '4', '5'] },
      { lines: ['1', '2', '3', ' ', ' '] },
      { lines: ['1', '2', ' ', ' ', ' '] },
    ]);
  });

  it('should truncate if the option is set', () => {
    const values = [{ lines: ['1 2 3 4 5'] }, { lines: ['1', '2', '3'] }, { lines: ['1', '2'] }];
    const constraint = { cells: [{ overflow: CellOverflow.truncate }] };
    const widths = [4, 1, 1];
    const formatted = format(values, widths, constraint);
    expect(formatted).toEqual([
      { lines: ['1 2 ', '    ', '    '] },
      { lines: ['1', '2', '3'] },
      { lines: ['1', '2', ' '] },
    ]);
  });

  it('should add ellipsis if the option is set', () => {
    const values = [{ lines: ['1 2 3 4 5'] }, { lines: ['1', '2', '3'] }, { lines: ['1', '2'] }];
    const constraint = { cells: [{ overflow: CellOverflow.ellipsis }] };
    const widths = [4, 1, 1];
    const formatted = format(values, widths, constraint);
    expect(formatted).toEqual([
      { lines: ['1 2…', '    ', '    '] },
      { lines: ['1', '2', '3'] },
      { lines: ['1', '2', ' '] },
    ]);
  });

  it('should truncate the lines in the row if the option is set', () => {
    const values = [{ lines: ['1 2 3 4 5'] }, { lines: ['1', '2', '3'] }, { lines: ['1', '2'] }];
    const constraint = { max: 3 };

    const widths = [1, 1, 1];
    const formatted = format(values, widths, constraint);
    expect(formatted).toEqual([{ lines: ['1', '2', '…'] }, { lines: ['1', '2', '3'] }, { lines: ['1', '2', ' '] }]);
  });

  it('should truncate without an ellipsis if the option is set', () => {
    const values = [{ lines: ['1 2 3 4 5'] }, { lines: ['1', '2', '3'] }, { lines: ['1', '2'] }];
    const constraint = { max: 3, ellipsis: '' };
    const widths = [1, 1, 1];
    const formatted = format(values, widths, constraint);
    expect(formatted).toEqual([{ lines: ['1', '2', '3'] }, { lines: ['1', '2', '3'] }, { lines: ['1', '2', ' '] }]);
  });

  it('should not truncate the lines if the max is not reached', () => {
    const values = [{ lines: ['1 2 3'] }, { lines: ['1', '2', '3'] }, { lines: ['1', '2'] }];
    const constraint = { max: 5 };
    const widths = [1, 1, 1];
    const formatted = format(values, widths, constraint);
    expect(formatted).toEqual([{ lines: ['1', '2', '3'] }, { lines: ['1', '2', '3'] }, { lines: ['1', '2', ' '] }]);
  });

  it('should add lines if the min option is set', () => {
    const values = [{ lines: ['1 2 3'] }, { lines: ['1', '2', '3'] }, { lines: ['1', '2'] }];
    const constraint = { min: 5 };
    const widths = [1, 1, 1];
    const formatted = format(values, widths, constraint);
    expect(formatted).toEqual([
      { lines: ['1', '2', '3', ' ', ' '] },
      { lines: ['1', '2', '3', ' ', ' '] },
      { lines: ['1', '2', ' ', ' ', ' '] },
    ]);
  });

  it('should not add lines if the min is reached', () => {
    const values = [{ lines: ['1 2 3'] }, { lines: ['1', '2', '3'] }, { lines: ['1', '2'] }];
    const constraint = { min: 2 };
    const widths = [1, 1, 1];
    const formatted = format(values, widths, constraint);
    expect(formatted).toEqual([{ lines: ['1', '2', '3'] }, { lines: ['1', '2', '3'] }, { lines: ['1', '2', ' '] }]);
  });

  it('should call the formatter if one is set', () => {
    const values = [{ lines: ['1 2 3'] }, { lines: ['1', '2', '3'] }, { lines: ['1', '2'] }];
    const formatter = (value: string) => `${parseInt(value, 10) + 1}`;
    const constraint = { cells: [{ formatter }] };

    const widths = [1, 1, 1];
    const formatted = format(values, widths, constraint);
    expect(formatted).toEqual([{ lines: ['2', '3', '4'] }, { lines: ['1', '2', '3'] }, { lines: ['1', '2', ' '] }]);
  });

  it('should format with a line max of 1', () => {
    const values = [{ lines: ['1 2 3'] }, { lines: ['1', '2', '3'] }, { lines: ['1', '2'] }];
    const formatter = (value: string) => `${parseInt(value, 10) + 1}`;
    const constraint = { max: 1, cells: [{ formatter }] };

    const widths = [1, 1, 1];
    const formatted = format(values, widths, constraint);
    expect(formatted).toEqual([{ lines: ['2'] }, { lines: ['1'] }, { lines: ['1'] }]);
  });

  it('should format with a column width of 0', () => {
    const values = [{ lines: ['1 2 3'] }, { lines: ['1', '2', '3'] }, { lines: ['1', '2'] }];

    const widths = [1, 1, 0];
    const formatted = format(values, widths);
    expect(formatted).toEqual([{ lines: ['1', '2', '3'] }, { lines: ['1', '2', '3'] }, { lines: ['', '', ''] }]);
  });
});
