import { IText, Text } from '@5qtrs/text';

// ------------------
// Internal Constants
// ------------------

const defaultEllipsis = '…';

// ------------------
// Internal Functions
// ------------------

function validate(values: ICell[], widths: number[]) {
  if (values.length !== widths.length) {
    const message = [
      `The number of row values, '${values.length}',`,
      `must be equal to the number of column width values, '${widths.length}'`,
    ].join(' ');
    throw new Error(message);
  }
}

function removeOverflow(lines: Text[], width: number, indent?: string, overflow: CellOverflow = CellOverflow.wrap) {
  if (width === 0) {
    return [Text.empty()];
  }

  const result = [];
  if (overflow === CellOverflow.wrap) {
    for (const line of lines) {
      result.push(...line.wrap(width, indent));
    }
  } else {
    const ellipsis = overflow === CellOverflow.truncate ? '' : undefined;
    for (const line of lines) {
      result.push(...line.truncate(width, ellipsis));
    }
  }

  return result;
}

function truncateCell(lines: Text[], max?: number, ellipsis: string = defaultEllipsis) {
  if (max !== undefined && lines.length > max) {
    lines = lines.slice(0, max);
    if (ellipsis && max > 1) {
      lines.pop();
      lines.push(Text.create(ellipsis));
    }
  }
  return lines;
}

function alignCell(lines: Text[], width: number, align: CellAlignment = CellAlignment.left) {
  let func = (line: Text) => line.padRight(width);
  if (align === CellAlignment.right) {
    func = (line: Text) => line.padLeft(width);
  } else if (align === CellAlignment.center) {
    func = (line: Text) => line.pad(width);
  }
  return lines.map(func);
}

// -------------------
// Exported Interfaces
// -------------------

export enum CellAlignment {
  left = 'left',
  right = 'right',
  center = 'center',
}

export enum CellOverflow {
  wrap = 'wrap',
  truncate = 'truncate',
  ellipsis = 'ellipsis',
}

export interface ICellConstraint {
  align?: CellAlignment;
  overflow?: CellOverflow;
  wrapIndent?: string;
  ellipsis?: string;
}

export interface IRowConstraint {
  min?: number;
  max?: number;
  ellipsis?: string;
  cells?: (ICellConstraint | undefined)[];
}

export interface ICell {
  lines: Text[];
}

// ------------------
// Exported Functions
// ------------------

export function format(values: ICell[], widths: number[], constraint?: IRowConstraint) {
  constraint = constraint || { cells: [] };
  constraint.cells = constraint.cells || [];

  validate(values, widths);

  let height = constraint.min === undefined ? 0 : constraint.min;
  const formatted: ICell[] = [];
  for (let i = 0; i < values.length; i++) {
    const cellConstraint = constraint.cells[i] || {};
    let lines = values[i].lines;
    lines = removeOverflow(lines, widths[i], cellConstraint.wrapIndent, cellConstraint.overflow);
    lines = truncateCell(lines, constraint.max, constraint.ellipsis);
    lines = alignCell(lines, widths[i], cellConstraint.align);
    if (lines.length > height) {
      height = lines.length;
    }
    formatted.push({ lines });
  }

  for (let i = 0; i < formatted.length; i++) {
    const lines = formatted[i].lines;
    while (lines.length < height) {
      const emptyLine = Text.empty().pad(widths[i]);
      lines.push(emptyLine);
    }
  }

  return formatted;
}
