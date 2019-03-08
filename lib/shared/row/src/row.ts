import { padCenter, padLeft, padRight, truncate, wrap } from '@5qtrs/string';

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

function formatCell(lines: string[], formatter?: (line: string) => string) {
  const formattedLines = [];
  for (const line of lines) {
    formattedLines.push(formatter ? formatter(line) : line);
  }
  return formattedLines;
}

function removeOverflow(lines: string[], width: number, indent?: string, overflow: CellOverflow = CellOverflow.wrap) {
  if (width === 0) {
    return [''];
  }
  if (overflow === CellOverflow.wrap) {
    return wrap(lines, width, indent);
  } else {
    const ellipsis = overflow === CellOverflow.truncate ? '' : undefined;
    return truncate(lines, width, ellipsis);
  }
}

function truncateCell(lines: string[], max?: number, ellipsis: string = defaultEllipsis) {
  if (max !== undefined && lines.length > max) {
    lines = lines.slice(0, max);
    if (ellipsis && max > 1) {
      lines.pop();
      lines.push(ellipsis);
    }
  }
  return lines;
}

function alignCell(lines: string[], width: number, align: CellAlignment = CellAlignment.left) {
  let alignFunc = padRight;
  if (align === CellAlignment.right) {
    alignFunc = padLeft;
  } else if (align === CellAlignment.center) {
    alignFunc = padCenter;
  }

  const alignedLines = [];
  for (const line of lines) {
    alignedLines.push(alignFunc(line, width));
  }

  return alignedLines;
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
  formatter?: (line: string) => string;
}

export interface IRowConstraint {
  min?: number;
  max?: number;
  ellipsis?: string;
  cells?: (ICellConstraint | undefined)[];
}

export interface ICell {
  lines: string[];
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
    lines = formatCell(lines, cellConstraint.formatter);
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
      lines.push(padLeft('', widths[i]));
    }
  }

  return formatted;
}
