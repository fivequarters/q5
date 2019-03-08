import { IColumnsConstraint, resize, validate } from '@5qtrs/column';
import { format, ICell, ICellConstraint, IRowConstraint } from '@5qtrs/row';
import { padLeft, toLines, width } from '@5qtrs/string';
import { EOL } from 'os';

export { IColumnsConstraint, IColumnConstraint } from '@5qtrs/column';
export { IRowConstraint, ICellConstraint, CellAlignment, CellOverflow } from '@5qtrs/row';

// ----------------
// Exported Classes
// ----------------

interface IRow {
  cells: ICell[];
}

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
  private rows: { values: string[]; constraint: IRowConstraint }[];

  private constructor(constraints: IColumnsConstraint) {
    this.columnConstraint = constraints;
    this.rowConstraint = {};
    this.rows = [];
  }

  public addRow(values: string[]) {
    if (values.length !== this.columnCount) {
      throw new Error(`A row must have as many values as there are columns: ${this.columnCount}`);
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
      formatter: constraint.formatter,
    };
  }

  public clearCellConstraint(column: number) {
    this.validateColumnIndex(column);
    this.rowConstraint.cells = this.rowConstraint.cells || [];
    this.rowConstraint.cells[column] = undefined;
  }

  public toString() {
    const allRowValues = this.getAllRowValues();
    const columnWidths = this.getColumnWidths(allRowValues);
    const rowStrings = [];
    for (let i = 0; i < allRowValues.length; i++) {
      const formattedRow = format(allRowValues[i].cells, columnWidths, this.rows[i].constraint);
      rowStrings.push(this.rowToString(formattedRow));
    }

    return rowStrings.join(EOL);
  }

  private getAllRowValues() {
    const allRowValues: IRow[] = [];
    for (const row of this.rows) {
      const rowValues: IRow = { cells: [] };
      for (const value of row.values) {
        rowValues.cells.push({ lines: toLines(value) });
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
        if (cellWidth > (columnWidths[i] || 0)) {
          columnWidths[i] = cellWidth;
        }
      }
    }
    return resize(columnWidths, this.columnConstraint);
  }

  private rowToString(formmatedRow: ICell[]) {
    const gutter = padLeft('', this.columnConstraint.gutter || 0);
    const lines = [];
    for (let i = 0; i < formmatedRow[0].lines.length; i++) {
      const line = [];
      for (const cell of formmatedRow) {
        line.push(cell.lines[i]);
      }
      lines.push(line.join(gutter));
    }

    return lines.join(EOL);
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
