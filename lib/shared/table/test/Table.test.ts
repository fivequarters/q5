import { CellAlignment, CellOverflow, Table } from '../src';

export interface IColumnConstraint {
  min?: number;
  max?: number;
  flexGrow?: number;
  flexShrink?: number;
}

export interface IColumnsConstraint {
  width: number;
  gutter: number;
  columns: IColumnConstraint[];
}

describe('Table', () => {
  describe('create()', () => {
    it('should return a table', async () => {
      const columnsConstraint = { width: 20, count: 2 };
      const table = await Table.create(columnsConstraint);
      expect(table).toBeInstanceOf(Table);
    });
  });

  describe('rowCount', () => {
    it('should return the number of rows', async () => {
      const columnsConstraint = { width: 20, count: 2, columns: [{ min: 5 }, { min: 5 }] };
      const table = await Table.create(columnsConstraint);
      expect(table.rowCount).toBe(0);
      table.addRow(['1', '2']);
      expect(table.rowCount).toBe(1);
      table.addRow(['1', '2']);
      expect(table.rowCount).toBe(2);
    });
  });

  describe('addRow()', () => {
    it('should error if the number of values is less than the column count', async () => {
      const columnsConstraint = { width: 20, count: 2, columns: [{ min: 5 }, { min: 5 }] };
      const table = await Table.create(columnsConstraint);

      let message = '';
      try {
        table.addRow(['1']);
      } catch (error) {
        message = error.message;
      }
      expect(message).toBe('A row must have as many values as there are columns: 2');
    });

    it('should error if the number of values is greater than the column count', async () => {
      const columnsConstraint = { width: 20, count: 2, columns: [{ min: 5 }, { min: 5 }] };
      const table = await Table.create(columnsConstraint);

      let message = '';
      try {
        table.addRow(['1', '2', '3']);
      } catch (error) {
        message = error.message;
      }
      expect(message).toBe('A row must have as many values as there are columns: 2');
    });
  });
  describe('setCellConstraint()', () => {
    it('should set the row constraint', async () => {
      const columnsConstraint = { width: 20, count: 2, columns: [{ min: 5 }, { min: 5 }] };
      const table = await Table.create(columnsConstraint);
      table.setRowConstraint({ max: 1 });
      table.addRow(['value 1 that will be truncated', 'value 2']);
      expect(table.toString()).toBe(['value 1 that   value'].join('\n'));
    });

    it('should set any provided cell constraints', async () => {
      const columnsConstraint = { width: 20, count: 2, columns: [{ min: 5 }, { min: 5 }] };
      const table = await Table.create(columnsConstraint);
      table.setRowConstraint({ max: 1, cells: [{}, { overflow: CellOverflow.ellipsis }] });
      table.addRow(['value 1 that will be truncated', 'value 2']);
      expect(table.toString()).toBe(['value 1 that   valu…'].join('\n'));
    });
  });

  describe('clearRowConstraint()', () => {
    it('should clear the row constraint', async () => {
      const columnsConstraint = { width: 20, count: 2, columns: [{ min: 5 }, { min: 5 }] };
      const table = await Table.create(columnsConstraint);
      table.setRowConstraint({ max: 1 });
      table.addRow(['value 1 that will be truncated', 'value 2']);
      table.clearRowConstraint();
      table.addRow(['value 3 that will wrap', 'value 4']);
      expect(table.toString()).toBe(['value 1 that   value', 'value 3 that   value', 'will wrap      4'].join('\n'));
    });

    it('should do nothing if the row constraint was not set', async () => {
      const columnsConstraint = { width: 20, count: 2, columns: [{ min: 5 }, { min: 5 }] };
      const table = await Table.create(columnsConstraint);
      table.clearRowConstraint();
    });
  });

  describe('setCellConstraint()', () => {
    it('should set the cell constraint', async () => {
      const columnsConstraint = { width: 20, count: 2, columns: [{ min: 5 }, { min: 5 }] };
      const table = await Table.create(columnsConstraint);
      table.setCellConstraint(1, { align: CellAlignment.right });
      table.addRow(['value 1', 'value 2']);
      expect(table.toString()).toBe(['value 1      value 2'].join('\n'));
    });

    it('should error if the column index is invalid', async () => {
      const columnsConstraint = { width: 20, count: 2, columns: [{ min: 5 }, { min: 5 }] };
      const table = await Table.create(columnsConstraint);

      let message = '';
      try {
        table.setCellConstraint(2, { align: CellAlignment.right });
      } catch (error) {
        message = error.message;
      }
      expect(message).toBe("The column index, '2', is greater than the number of columns, '2'");
    });

    it('should error if the column index is less than 0', async () => {
      const columnsConstraint = { width: 20, count: 2, columns: [{ min: 5 }, { min: 5 }] };
      const table = await Table.create(columnsConstraint);

      let message = '';
      try {
        table.setCellConstraint(-1, { align: CellAlignment.right });
      } catch (error) {
        message = error.message;
      }
      expect(message).toBe("The column index, '-1', must be 0 or greater");
    });
  });

  describe('clearCellConstraint()', () => {
    it('should clear the cell constraint', async () => {
      const columnsConstraint = { width: 20, count: 2, columns: [{ min: 5 }, { min: 5 }] };
      const table = await Table.create(columnsConstraint);
      table.setCellConstraint(1, { align: CellAlignment.right });
      table.addRow(['value 1', 'value 2']);
      table.clearCellConstraint(1);
      table.addRow(['value 3', 'value 4']);
      expect(table.toString()).toBe(['value 1      value 2', 'value 3   value 4'].join('\n'));
    });

    it('should error if the column index is invalid', async () => {
      const columnsConstraint = { width: 20, count: 2, columns: [{ min: 5 }, { min: 5 }] };
      const table = await Table.create(columnsConstraint);
      table.setCellConstraint(1, { align: CellAlignment.right });

      let message = '';
      try {
        table.clearCellConstraint(2);
      } catch (error) {
        message = error.message;
      }
      expect(message).toBe("The column index, '2', is greater than the number of columns, '2'");
    });

    it('should error if the column index is less than 0', async () => {
      const columnsConstraint = { width: 20, count: 2, columns: [{ min: 5 }, { min: 5 }] };
      const table = await Table.create(columnsConstraint);
      table.setCellConstraint(1, { align: CellAlignment.right });

      let message = '';
      try {
        table.clearCellConstraint(-1);
      } catch (error) {
        message = error.message;
      }
      expect(message).toBe("The column index, '-1', must be 0 or greater");
    });

    it('should do nothing if the cell constraint was not set', async () => {
      const columnsConstraint = { width: 20, count: 2, columns: [{ min: 5 }, { min: 5 }] };
      const table = await Table.create(columnsConstraint);
      table.clearCellConstraint(1);
    });
  });

  describe('toString()', () => {
    it('should return an empty string if there are no rows', async () => {
      const columnsConstraint = { width: 20, count: 2 };
      const table = await Table.create(columnsConstraint);
      expect(table.toString()).toBe('');
    });
    it('should stringify the table', async () => {
      const columnsConstraint = { width: 20, count: 2 };
      const table = await Table.create(columnsConstraint);
      table.addRow(['value 1', 'value 2']);
      table.addRow(['value 3', 'value 4']);
      expect(table.toString()).toBe(['value 1   value 2', 'value 3   value 4'].join('\n'));
    });

    it('should stringify the table with cell constraints', async () => {
      const columnsConstraint = { width: 20, count: 2 };
      const table = await Table.create(columnsConstraint);
      table.setCellConstraint(1, { align: CellAlignment.right });
      table.addRow(['value 1', 'value 2']);
      table.addRow(['value 3', 'value 4']);
      expect(table.toString()).toBe(['value 1      value 2', 'value 3      value 4'].join('\n'));
    });

    it('should stringify the table with row constraints', async () => {
      const columnsConstraint = { width: 20, count: 2 };
      const table = await Table.create(columnsConstraint);
      table.setRowConstraint({ max: 1 });
      table.addRow(['value 1 that will be truncated', 'value 2']);
      table.addRow(['value 3', 'value 4']);
      expect(table.toString()).toBe(['value 1 that will be', 'value 3'].join('\n'));
    });
  });
});
