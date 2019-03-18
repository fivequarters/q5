// ------------------
// Internal Constants
// ------------------

const defaultFlexGrow = 0;
const defaultFlexShrink = 1;

// ------------------
// Internal Functions
// ------------------

function ensureMinMaxWidths(columnWidths: number[], constraint: IColumnsConstraint) {
  const columnContraints = constraint.columns || [];
  for (let i = 0; i < columnWidths.length; i++) {
    const columnConstraint = columnContraints[i] || {};
    const min = columnConstraint.min;
    const max = columnConstraint.max;
    if (min !== undefined && columnWidths[i] < min) {
      columnWidths[i] = min;
    } else if (max !== undefined && columnWidths[i] > max) {
      columnWidths[i] = max;
    }
  }
}

function getRemainingWidth(columnWidths: number[], constraint: IColumnsConstraint) {
  let currentWidth = 0;
  for (let i = 0; i < columnWidths.length; i++) {
    if (i > 0) {
      currentWidth += constraint.gutter || 0;
    }
    currentWidth += columnWidths[i];
  }
  return constraint.width - currentWidth;
}

function getIndexByFlex(constraint: IColumnsConstraint, grow: boolean) {
  const result: number[] = [];
  for (let i = 0; i < constraint.count; i++) {
    result.push(i);
  }
  const defaultFlex = grow ? defaultFlexGrow : defaultFlexShrink;
  const constraints = constraint.columns || [];
  result.sort((a, b) => {
    const constraintA = constraints[a] || {};
    const constraintB = constraints[b] || {};
    const aFlex = grow ? constraintA.flexGrow : constraintA.flexShrink;
    const bFlex = grow ? constraintB.flexGrow : constraintB.flexShrink;
    return (aFlex === undefined ? defaultFlex : aFlex) - (bFlex === undefined ? defaultFlex : bFlex);
  });
  return result;
}

function resizeColumns(remainingWidth: number, columnWidths: number[], constraint: IColumnsConstraint, grow: boolean) {
  const constraints = constraint.columns || [];
  const indexByFlex = getIndexByFlex(constraint, grow);
  let next = 0;
  let widthAtLoopStart = remainingWidth;
  let forceLevel = 0;

  while (remainingWidth > 0) {
    const indexToAdjust = indexByFlex[next];
    const indexConstraint = constraints[indexToAdjust] || {};
    let flex = grow ? indexConstraint.flexGrow : indexConstraint.flexShrink;
    if (flex === undefined) {
      flex = grow ? defaultFlexGrow : defaultFlexShrink;
    }
    flex += forceLevel;

    if (grow) {
      const max = indexConstraint.max;
      if (max !== undefined) {
        if (flex > max - columnWidths[indexToAdjust]) {
          flex = max - columnWidths[indexToAdjust];
        }
      }
    } else {
      const min = indexConstraint.min;
      if (min !== undefined) {
        if (flex > columnWidths[indexToAdjust] - min) {
          flex = columnWidths[indexToAdjust] - min;
        }
      }
    }

    const sign = grow ? 1 : -1;
    if (flex > 0) {
      if (flex > remainingWidth) {
        columnWidths[indexToAdjust] += remainingWidth * sign;
        remainingWidth = 0;
      } else if (flex > columnWidths[indexToAdjust]) {
        remainingWidth -= columnWidths[indexToAdjust];
        columnWidths[indexToAdjust] = 0;
      } else {
        columnWidths[indexToAdjust] += flex * sign;
        remainingWidth -= flex;
      }
    }

    next++;
    if (next >= indexByFlex.length) {
      next = 0;
      if (widthAtLoopStart === remainingWidth) {
        forceLevel++;
      }
      widthAtLoopStart = remainingWidth;
    }
  }
}

// -------------------
// Exported Interfaces
// -------------------

export interface IColumnConstraint {
  min?: number;
  max?: number;
  flexGrow?: number;
  flexShrink?: number;
}

export interface IColumnsConstraint {
  width: number;
  count: number;
  gutter?: number;
  columns?: (IColumnConstraint | undefined)[];
}

// ------------------
// Exported Functions
// ------------------

export function resize(columnWidths: number[], constraint: IColumnsConstraint) {
  columnWidths = columnWidths.slice();
  ensureMinMaxWidths(columnWidths, constraint);
  const remainingWidth = getRemainingWidth(columnWidths, constraint);
  resizeColumns(Math.abs(remainingWidth), columnWidths, constraint, remainingWidth > 0);
  return columnWidths;
}

export function validate(constraints: IColumnsConstraint) {
  let totalMinWidth = 0;

  if (constraints.columns) {
    if (constraints.gutter) {
      totalMinWidth += constraints.gutter * (constraints.columns.length - 1);
    }

    for (const column of constraints.columns) {
      if (column) {
        if (column.min) {
          totalMinWidth += column.min;
        }
      }
    }

    if (totalMinWidth > constraints.width) {
      const message = [
        `Given the column gutter value of '${constraints.gutter}' and the combined`,
        'minimum widths of the columns, it is impossible to generate a',
        `a set of columns with a width less than or equal to the specified max width of '${constraints.width}'`,
      ].join(' ');
      throw new Error(message);
    }
  }
}
