import { resize, validate } from '../src';

describe('resize', () => {
  it('should do nothing with already correctly sized columns', () => {
    const columnWidths = [49, 49];
    const constraint = {
      width: 100,
      gutter: 2,
      count: 2,
      columns: [{ min: 20, max: 60 }, { min: 20, max: 60 }],
    };
    const resized = resize(columnWidths, constraint);
    expect(resized).toEqual([49, 49]);
  });

  it('should ensure columns meet min width constraint', () => {
    const columnWidths = [19, 49];
    const constraint = {
      width: 100,
      gutter: 2,
      count: 2,
      columns: [{ min: 49, max: 60 }, { min: 20, max: 60 }],
    };
    const resized = resize(columnWidths, constraint);
    expect(resized).toEqual([49, 49]);
  });

  it('should ensure columns meet max width constraint', () => {
    const columnWidths = [49, 61];
    const constraint = {
      width: 100,
      gutter: 2,
      count: 2,
      columns: [{ min: 20, max: 60 }, { min: 20, max: 49 }],
    };
    const resized = resize(columnWidths, constraint);
    expect(resized).toEqual([49, 49]);
  });

  it('should grow equal columns evenly with no flexGrow set', () => {
    const columnWidths = [20, 20];
    const constraint = {
      width: 100,
      gutter: 2,
      count: 2,
      columns: [{ min: 20, max: 60 }, { min: 20, max: 60 }],
    };
    const resized = resize(columnWidths, constraint);
    expect(resized).toEqual([49, 49]);
  });

  it('should shrink equal columns evenly with no flexshrink set', () => {
    const columnWidths = [80, 80];
    const constraint = {
      width: 100,
      gutter: 2,
      count: 2,
      columns: [{ min: 20, max: 80 }, { min: 20, max: 80 }],
    };
    const resized = resize(columnWidths, constraint);
    expect(resized).toEqual([49, 49]);
  });

  it('should grow only columns with flexGrow set to 1', () => {
    const columnWidths = [39, 39];
    const constraint = {
      width: 100,
      gutter: 2,
      count: 2,
      columns: [{ min: 20, max: 60, flexGrow: 1 }, { min: 20, max: 60 }],
    };
    const resized = resize(columnWidths, constraint);
    expect(resized).toEqual([59, 39]);
  });

  it('should shrink only columns with flexShrink not set to 0', () => {
    const columnWidths = [70, 39];
    const constraint = {
      width: 100,
      gutter: 2,
      count: 2,
      columns: [{ min: 20, max: 80 }, { min: 20, max: 60, flexShrink: 0 }],
    };
    const resized = resize(columnWidths, constraint);
    expect(resized).toEqual([59, 39]);
  });

  it('should grow a column with flexGrow set to 2 twice as much', () => {
    const columnWidths = [20, 20];
    const constraint = {
      width: 100,
      gutter: 2,
      count: 2,
      columns: [{ min: 20, max: 60, flexGrow: 2 }, { min: 20, max: 60, flexGrow: 1 }],
    };
    const resized = resize(columnWidths, constraint);
    expect(resized).toEqual([58, 40]);
  });

  it('should shrink a column with flexShrink set to 2 twice as much', () => {
    const columnWidths = [80, 80];
    const constraint = {
      width: 100,
      gutter: 2,
      count: 2,
      columns: [{ min: 20, max: 80, flexShrink: 2 }, { min: 20, max: 80 }],
    };
    const resized = resize(columnWidths, constraint);
    expect(resized).toEqual([39, 59]);
  });

  it('should not grow a column beyond its max', () => {
    const columnWidths = [43, 45];
    const constraint = {
      width: 100,
      gutter: 2,
      count: 2,
      columns: [{ min: 40, max: 50, flexGrow: 10 }, { min: 40, max: 50 }],
    };
    const resized = resize(columnWidths, constraint);
    expect(resized).toEqual([50, 48]);
  });

  it('should not shrink a column beyond its min', () => {
    const columnWidths = [53, 51];
    const constraint = {
      width: 100,
      gutter: 2,
      count: 2,
      columns: [{ min: 48, max: 60, flexShrink: 10 }, { min: 40, max: 60 }],
    };
    const resized = resize(columnWidths, constraint);
    expect(resized).toEqual([48, 50]);
  });

  it('should force columns to grow', () => {
    const columnWidths = [30, 40];
    const constraint = {
      width: 100,
      gutter: 2,
      count: 2,
      columns: [{ min: 40, max: 60 }, { min: 40, max: 45 }],
    };
    const resized = resize(columnWidths, constraint);
    expect(resized).toEqual([53, 45]);
  });

  it('should force columns to shrink', () => {
    const columnWidths = [60, 40];
    const constraint = {
      width: 100,
      gutter: 2,
      count: 2,
      columns: [{ min: 40, max: 60, flexShrink: 0 }, { min: 40, max: 45 }],
    };
    const resized = resize(columnWidths, constraint);
    expect(resized).toEqual([58, 40]);
  });

  it('should properly shrink a column greater than the full table', () => {
    const columnWidths = [110, 40];
    const constraint = {
      width: 100,
      count: 2,
    };
    const resized = resize(columnWidths, constraint);
    expect(resized).toEqual([85, 15]);
  });

  it('should never shrink a column width to a negative value', () => {
    const columnWidths = [110, 5];
    const constraint = {
      width: 100,
      count: 2,
    };
    const resized = resize(columnWidths, constraint);
    expect(resized).toEqual([100, 0]);
  });
});

describe('validate', () => {
  it('should do nothing if constraints are valid', () => {
    const constraint = {
      width: 100,
      gutter: 2,
      count: 2,
      columns: [{ min: 20, max: 60 }, { min: 20, max: 60 }],
    };

    let message = '';
    try {
      validate(constraint);
    } catch (error) {
      message = error.message;
    }
    expect(message).toBe('');
  });

  it('should throw if the contraints are not valid', () => {
    const constraint = {
      width: 100,
      gutter: 2,
      count: 2,
      columns: [{ min: 50, max: 60 }, { min: 50, max: 60 }],
    };

    let message = '';
    try {
      validate(constraint);
    } catch (error) {
      message = error.message;
    }
    expect(message).toBe(
      [
        "Given the column gutter value of '2' and the combined minimum widths of the columns,",
        'it is impossible to generate a a set of columns with a width less than or equal to',
        "the specified max width of '100'",
      ].join(' ')
    );
  });
});
