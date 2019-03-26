import { IText, Text } from '@5qtrs/text';
import { EOL } from 'os';
import { IColumnsConstraint, resize, validate } from './column';
import { format, ICell, ICellConstraint, IRowConstraint } from './row';

// ------------------
// Internal Functions
// ------------------

function width(lines: Text[]) {
  let max = 0;
  for (const line of lines) {
    if (line.length > max) {
      max = line.length;
    }
  }
  return max;
}

// -------------------
// Internal Interfaces
// -------------------

interface IRow {
  cells: ICell[];
}

// ----------------
// Exported Classes
// ----------------

export class Table {
  public get columnCount() {
    return this.columnConstraint.count;
  }

  public get rowCount() {
    return this.rows.length;
  }

  public static async create(constraints: IColumnsConstraint) {
    validate(constraints);
    return new Table(constraints);
  }

  private columnConstraint: IColumnsConstraint;
  private rowConstraint: IRowConstraint;
  private rows: { values: Text[]; constraint: IRowConstraint }[];

  private constructor(constraints: IColumnsConstraint) {
    this.columnConstraint = constraints;
    this.rowConstraint = {};
    this.rows = [];
  }

  public addRow(cellValues: IText[]) {
    if (cellValues.length !== this.columnCount) {
      throw new Error(`A row must have as many values as there are columns: ${this.columnCount}`);
    }
    const values: Text[] = [];
    for (const cellValue of cellValues) {
      values.push(cellValue instanceof Text ? cellValue : Text.create(cellValue));
    }

    this.rows.push({
      values,
      constraint: {
        min: this.rowConstraint.min,
        max: this.rowConstraint.max,
        ellipsis: this.rowConstraint.ellipsis,
        cells: this.rowConstraint.cells ? this.rowConstraint.cells.slice() : [],
      },
    });
  }

  public setRowConstraint(constraint: IRowConstraint) {
    this.rowConstraint = {
      min: constraint.min,
      max: constraint.max,
      ellipsis: constraint.ellipsis,
      cells: constraint.cells ? constraint.cells.slice() : [],
    };
  }

  public clearRowConstraint() {
    this.rowConstraint = {};
  }

  public setCellConstraint(column: number, constraint: ICellConstraint) {
    this.validateColumnIndex(column);
    this.rowConstraint.cells = this.rowConstraint.cells || [];
    this.rowConstraint.cells[column] = {
      align: constraint.align,
      overflow: constraint.overflow,
      wrapIndent: constraint.wrapIndent,
      ellipsis: constraint.ellipsis,
    };
  }

  public clearCellConstraint(column: number) {
    this.validateColumnIndex(column);
    this.rowConstraint.cells = this.rowConstraint.cells || [];
    this.rowConstraint.cells[column] = undefined;
  }

  public toString(enableStyle?: boolean) {
    return this.toText().toString(enableStyle);
  }

  public toText() {
    const allRowValues = this.getAllRowValues();
    const columnWidths = this.getColumnWidths(allRowValues);
    const rowStrings = [];
    const gutter =
      typeof this.columnConstraint.gutter === 'number'
        ? Text.empty().pad(this.columnConstraint.gutter || 0)
        : this.columnConstraint.gutter || '';
    for (let i = 0; i < allRowValues.length; i++) {
      const formattedRow = format(allRowValues[i].cells, columnWidths, this.rows[i].constraint);
      rowStrings.push(this.rowToString(formattedRow, gutter));
    }

    return Text.join(rowStrings, EOL);
  }

  private getAllRowValues() {
    const allRowValues: IRow[] = [];
    for (const row of this.rows) {
      const rowValues: IRow = { cells: [] };
      for (const value of row.values) {
        rowValues.cells.push({ lines: value.lines() });
      }
      allRowValues.push(rowValues);
    }
    return allRowValues;
  }

  private getColumnWidths(allRowValues: IRow[]) {
    const columnWidths: number[] = [];
    for (const rowValues of allRowValues) {
      for (let i = 0; i < rowValues.cells.length; i++) {
        const cellWidth = width(rowValues.cells[i].lines);
        if (cellWidth >= (columnWidths[i] || 0)) {
          columnWidths[i] = cellWidth;
        }
      }
    }
    return resize(columnWidths, this.columnConstraint);
  }

  private rowToString(formmatedRow: ICell[], gutter: IText) {
    const lines = [];
    for (let i = 0; i < formmatedRow[0].lines.length; i++) {
      const line = [];
      for (const cell of formmatedRow) {
        line.push(cell.lines[i]);
      }
      const fullLine = Text.join(line, gutter);
      lines.push(fullLine);
    }

    return Text.join(lines, EOL);
  }

  private validateColumnIndex(column: number) {
    if (column < 0) {
      throw new Error(`The column index, '${column}', must be 0 or greater`);
    }
    if (column >= this.columnCount) {
      throw new Error(`The column index, '${column}', is greater than the number of columns, '${this.columnCount}'`);
    }
  }
}
