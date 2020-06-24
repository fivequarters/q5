import { LinearProgress } from '@material-ui/core';
import Checkbox from '@material-ui/core/Checkbox';
import Grid from '@material-ui/core/Grid';
import IconButton from '@material-ui/core/IconButton';
import { createStyles, lighten, makeStyles, Theme } from '@material-ui/core/styles';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableHead from '@material-ui/core/TableHead';
import TablePagination from '@material-ui/core/TablePagination';
import TableRow from '@material-ui/core/TableRow';
import TableSortLabel from '@material-ui/core/TableSortLabel';
import Toolbar from '@material-ui/core/Toolbar';
import Typography from '@material-ui/core/Typography';
import DeleteIcon from '@material-ui/icons/Delete';
import clsx from 'clsx';
import React from 'react';
import { getUISettings, setUISettings } from '../lib/Settings';
import ConfirmationDialog from './ConfirmationDialog';
import FilterFab from './FilterFab';

function desc<T>(a: T, b: T, orderBy: keyof T) {
  if (b[orderBy] < a[orderBy]) {
    return -1;
  }
  if (b[orderBy] > a[orderBy]) {
    return 1;
  }
  return 0;
}

function stableSort<T>(array: T[], cmp: (a: T, b: T) => number) {
  const stabilizedThis = array.map((el, index) => [el, index] as [T, number]);
  stabilizedThis.sort((a, b) => {
    const order = cmp(a[0], b[0]);
    if (order !== 0) return order;
    return a[1] - b[1];
  });
  return stabilizedThis.map((el) => el[0]);
}

type Order = 'asc' | 'desc';

function getSorting<T>(order: Order, orderBy: keyof T): (a: T, b: T) => number {
  return order === 'desc' ? (a, b) => desc(a, b, orderBy) : (a, b) => -desc(a, b, orderBy);
}

export interface HeadCell<T> {
  disablePadding?: boolean;
  disableSorting?: boolean;
  id: keyof T;
  label: string | JSX.Element;
  align?: 'left' | 'right' | 'inherit' | 'center' | 'justify';
  render?: (row: T, tableRow: number) => any;
  getRowSpan?: (row: T, tableRow: number) => number;
}

interface EnhancedTableProps<T> {
  classes: ReturnType<typeof useStyles>;
  numSelected: number;
  onRequestSort: (event: React.MouseEvent<unknown>, property: keyof T) => void;
  onSelectAllClick: (event: React.ChangeEvent<HTMLInputElement>, checked: boolean) => void;
  order: Order;
  orderBy: keyof T;
  rowCount: number;
  headCells: HeadCell<T>[];
  enableSelection?: boolean;
}

function EnhancedTableHead<T>(props: EnhancedTableProps<T>) {
  const {
    classes,
    onSelectAllClick,
    order,
    orderBy,
    numSelected,
    rowCount,
    onRequestSort,
    headCells,
    enableSelection,
  } = props;
  const createSortHandler = (property: keyof T) => (event: React.MouseEvent<unknown>) => {
    onRequestSort(event, property);
  };

  return (
    <TableHead>
      <TableRow>
        {enableSelection && (
          <TableCell padding="checkbox">
            <Checkbox
              color="primary"
              indeterminate={numSelected > 0 && numSelected < rowCount}
              checked={numSelected === rowCount}
              onChange={onSelectAllClick}
              inputProps={{ 'aria-label': 'select all desserts' }}
            />
          </TableCell>
        )}
        {headCells.map((headCell) => (
          <TableCell
            key={headCell.id as string}
            align={headCell.align || 'right'}
            padding={headCell.disablePadding ? 'none' : 'default'}
            sortDirection={orderBy === headCell.id ? order : false}
          >
            {!headCell.disableSorting && (
              <TableSortLabel
                active={orderBy === headCell.id}
                direction={order}
                onClick={createSortHandler(headCell.id)}
              >
                {headCell.label}
                {orderBy === headCell.id ? (
                  <span className={classes.visuallyHidden}>
                    {order === 'desc' ? 'sorted descending' : 'sorted ascending'}
                  </span>
                ) : null}
              </TableSortLabel>
            )}
            {headCell.disableSorting && headCell.label}
          </TableCell>
        ))}
      </TableRow>
    </TableHead>
  );
}

const useToolbarStyles = makeStyles((theme: Theme) =>
  createStyles({
    root: {
      paddingLeft: theme.spacing(2),
      paddingRight: theme.spacing(1),
    },
    highlight: {
      color: theme.palette.primary.main,
      backgroundColor: lighten(theme.palette.secondary.light, 0.85),
    },
    title: {
      flex: '1 1 100%',
      display: 'flex',
      alignItems: 'center',
    },
  })
);

interface EnhancedTableToolbarProps {
  numSelected: number;
  title: string;
  actions?: JSX.Element;
  filterContent?: JSX.Element;
  onDelete: () => void;
}

const EnhancedTableToolbar = (props: EnhancedTableToolbarProps) => {
  const classes = useToolbarStyles();
  const { numSelected, title, onDelete, actions, filterContent } = props;

  return (
    <Toolbar
      className={clsx(classes.root, {
        [classes.highlight]: numSelected > 0,
      })}
    >
      {numSelected > 0 ? (
        <Typography className={classes.title} color="inherit" variant="subtitle1">
          {numSelected} selected
        </Typography>
      ) : (
        <Typography className={classes.title} variant="h6" id="tableTitle">
          {title}
          {actions}
        </Typography>
      )}
      {numSelected > 0 ? (
        <IconButton onClick={() => onDelete()} aria-label="delete" color="primary">
          <DeleteIcon />
        </IconButton>
      ) : filterContent ? (
        <FilterFab>{filterContent}</FilterFab>
      ) : undefined}
    </Toolbar>
  );
};

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    root: {
      marginLeft: theme.spacing(2),
      marginRight: theme.spacing(2),
      marginBottom: theme.spacing(2),
      marginTop: theme.spacing(2),
    },
    table: {
      minWidth: 750,
    },
    visuallyHidden: {
      border: 0,
      clip: 'rect(0 0 0 0)',
      height: 1,
      margin: -1,
      overflow: 'hidden',
      padding: 0,
      position: 'absolute',
      top: 20,
      width: 1,
    },
    multilineRow: {
      verticalAlign: 'top',
    },
    noBorder: {
      borderBottom: 'none',
    },
  })
);

interface ExplorerTableProps<T> {
  rows: T[];
  headCells: HeadCell<T>[];
  getTableRows?: (row: T) => number;
  defaultSortKey: keyof T;
  defaultSortOrder?: 'asc' | 'desc';
  identityKey: keyof T;
  title: string;
  actions?: JSX.Element;
  filterContent?: JSX.Element;
  enableSelection?: boolean;
  onDelete?: (selected: string[]) => void;
  deleteTitle?: string | ((selected: string[]) => string);
  deleteContent?: string | ((selected: string[]) => JSX.Element);
  disablePagination?: boolean;
  noDataBody?: JSX.Element;
  firstRowMessage?: JSX.Element;
  filterChips?: JSX.Element;
  size?: string;
}

export default function ExplorerTable<T>(props: ExplorerTableProps<T>) {
  const {
    title,
    actions,
    defaultSortKey,
    defaultSortOrder,
    headCells,
    rows,
    identityKey,
    enableSelection,
    onDelete,
    deleteTitle,
    deleteContent,
    noDataBody,
    size,
    getTableRows,
    filterContent,
    firstRowMessage,
    filterChips,
  } = props;
  const classes = useStyles();
  const toolbarClasses = useToolbarStyles();
  const [order, setOrder] = React.useState<Order>(defaultSortOrder || 'asc');
  const [orderBy, setOrderBy] = React.useState<keyof T>(defaultSortKey);
  const [selected, setSelected] = React.useState<string[]>([]);
  const [page, setPage] = React.useState(0);
  // const [dense, setDense] = React.useState(false);
  const [rowsPerPage, setRowsPerPage] = React.useState(getUISettings().tableRowsPerPage);
  const [confirmDelete, setConfirmDelete] = React.useState<any>({
    status: 'closed',
  });

  React.useEffect(() => {
    if (confirmDelete.status === 'initiating') {
      setConfirmDelete({ status: 'deleting' });
      setSelected([]);
      (async () => {
        onDelete && (await onDelete(selected));
        setConfirmDelete({ status: 'closed' });
      })();
    }
  }, [selected, confirmDelete, onDelete]);

  const handleRequestSort = (event: React.MouseEvent<unknown>, property: keyof T) => {
    const isDesc = orderBy === property && order === 'desc';
    setOrder(isDesc ? 'asc' : 'desc');
    setOrderBy(property);
  };

  const handleSelectAllClick = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      const newSelecteds = rows.map((n) => (n[identityKey] as unknown) as string);
      setSelected(newSelecteds);
      return;
    }
    setSelected([]);
  };

  const handleDeleteDialogOpen = () => setConfirmDelete({ status: 'open' });

  const handleDelete = (confirmed: boolean) => {
    if (confirmed) {
      setConfirmDelete({ status: 'initiating' });
    } else {
      setConfirmDelete({ status: 'closed' });
    }
  };

  const handleClick = (event: React.MouseEvent<unknown>, name: string) => {
    const selectedIndex = selected.indexOf(name);
    let newSelected: string[] = [];

    if (selectedIndex === -1) {
      newSelected = newSelected.concat(selected, name);
    } else if (selectedIndex === 0) {
      newSelected = newSelected.concat(selected.slice(1));
    } else if (selectedIndex === selected.length - 1) {
      newSelected = newSelected.concat(selected.slice(0, -1));
    } else if (selectedIndex > 0) {
      newSelected = newSelected.concat(selected.slice(0, selectedIndex), selected.slice(selectedIndex + 1));
    }

    setSelected(newSelected);
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const rowsPerPage = parseInt(event.target.value, 10);
    setUISettings({ ...getUISettings(), tableRowsPerPage: rowsPerPage });
    setRowsPerPage(rowsPerPage);
    setPage(0);
  };

  // const handleChangeDense = (event: React.ChangeEvent<HTMLInputElement>) => {
  //   setDense(event.target.checked);
  // };

  const isSelected = (name: string) => selected.indexOf(name) !== -1;

  // const emptyRows = props.disablePagination
  //   ? 0
  //   : rowsPerPage - Math.min(rowsPerPage, rows.length - page * rowsPerPage);
  const emptyRows = 0;

  let dataRows = stableSort<T>(rows, getSorting<T>(order, orderBy));
  if (!props.disablePagination) {
    dataRows = dataRows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  }

  return (
    <div className={classes.root}>
      <Grid container spacing={2}>
        <Grid item xs={size === 'narrow' ? 8 : 12}>
          <ConfirmationDialog
            open={confirmDelete.status !== 'closed'}
            title={
              confirmDelete.status === 'open'
                ? deleteTitle
                  ? typeof deleteTitle === 'string'
                    ? deleteTitle
                    : deleteTitle(selected)
                  : `Confirm delete?`
                : 'Deleting...'
            }
            content={
              confirmDelete.status === 'open' ? (
                deleteContent ? (
                  typeof deleteContent === 'string' ? (
                    deleteContent
                  ) : (
                    deleteContent(selected)
                  )
                ) : (
                  `Delete ${selected.length} records?`
                )
              ) : (
                <LinearProgress />
              )
            }
            onDone={handleDelete}
            confirmText="Delete"
          />
          {/* <Paper className={classes.paper}> */}
          <EnhancedTableToolbar
            numSelected={selected.length}
            title={title}
            actions={actions}
            filterContent={filterContent}
            onDelete={handleDeleteDialogOpen}
          />
          {/* <TableContainer> */}
          {rows.length === 0 && noDataBody && <div className={toolbarClasses.root}>{noDataBody}</div>}
          {filterChips && <div className={toolbarClasses.root}>{filterChips}</div>}
          {(rows.length > 0 || !noDataBody) && (
            <React.Fragment>
              <Table
                className={classes.table}
                aria-labelledby="tableTitle"
                // size={dense ? "small" : "medium"}
                size="medium"
                aria-label="explorer table"
              >
                <EnhancedTableHead<T>
                  classes={classes}
                  numSelected={selected.length}
                  order={order}
                  orderBy={orderBy}
                  onSelectAllClick={handleSelectAllClick}
                  onRequestSort={handleRequestSort}
                  rowCount={rows.length}
                  headCells={headCells}
                  enableSelection={enableSelection}
                />
                <TableBody>
                  {firstRowMessage && (
                    <TableRow>
                      <TableCell colSpan={headCells.length + (enableSelection ? 1 : 0)}>{firstRowMessage}</TableCell>
                    </TableRow>
                  )}
                  {dataRows.map((row, index) => {
                    const isItemSelected = isSelected((row[identityKey] as unknown) as string);
                    const labelId = `explorer-table-checkbox-${index}`;
                    const tableRows = (getTableRows && getTableRows(row)) || 1;

                    return (
                      <React.Fragment key={`${(row[identityKey] as unknown) as string}`}>
                        {Array.from(Array(tableRows).keys()).map((_, tableRow) => (
                          <TableRow
                            hover={enableSelection}
                            onClick={
                              enableSelection
                                ? (event) => handleClick(event, (row[identityKey] as unknown) as string)
                                : undefined
                            }
                            role="checkbox"
                            aria-checked={isItemSelected}
                            tabIndex={-1}
                            key={`${(row[identityKey] as unknown) as string}-${tableRow}`}
                            selected={isItemSelected}
                            className={tableRows > 1 ? classes.multilineRow : undefined}
                          >
                            {enableSelection && tableRow === 0 && (
                              <TableCell padding="checkbox">
                                <Checkbox
                                  color="primary"
                                  checked={isItemSelected}
                                  inputProps={{ 'aria-labelledby': labelId }}
                                />
                              </TableCell>
                            )}
                            {headCells[0] && tableRow === 0 && (
                              <TableCell
                                component="th"
                                id={labelId}
                                scope="row"
                                padding={enableSelection ? 'none' : 'default'}
                                align={headCells[0].align || 'right'}
                                rowSpan={
                                  (headCells[0].getRowSpan && headCells[0].getRowSpan(row, tableRow)) || undefined
                                }
                              >
                                {headCells[0].render ? headCells[0].render(row, tableRow) : row[headCells[0].id]}
                              </TableCell>
                            )}
                            {headCells.map((cell, index) => {
                              if (index === 0) {
                                return undefined;
                              }
                              const cellContent = cell.render ? cell.render(row, tableRow) : row[cell.id];
                              if (cellContent === undefined) {
                                return undefined;
                              }
                              let rowSpan = (cell.getRowSpan && cell.getRowSpan(row, tableRow)) || undefined;
                              let hasBottomBorder = tableRows === tableRow + (rowSpan || 1);
                              const style: any = {};
                              if (tableRow > 0) {
                                style.paddingTop = 0;
                              }
                              if (tableRow < tableRows - 1) {
                                style.paddingBottom = 0;
                              }
                              return (
                                <TableCell
                                  key={('aaa' + cell.id) as string}
                                  align={cell.align || 'right'}
                                  rowSpan={rowSpan}
                                  className={hasBottomBorder ? undefined : classes.noBorder}
                                  style={style}
                                >
                                  {cellContent}
                                </TableCell>
                              );
                            })}
                          </TableRow>
                        ))}
                      </React.Fragment>
                    );
                  })}
                  {emptyRows > 0 && (
                    // <TableRow style={{ height: (dense ? 33 : 53) * emptyRows }}>
                    <TableRow style={{ height: 53 * emptyRows }}>
                      <TableCell colSpan={headCells.length + (enableSelection ? 1 : 0)} />
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              {/* </TableContainer> */}
              {!props.disablePagination && (
                <TablePagination
                  rowsPerPageOptions={[5, 10, 25, 50, 100]}
                  component="div"
                  count={rows.length}
                  rowsPerPage={rowsPerPage}
                  page={page}
                  onChangePage={handleChangePage}
                  onChangeRowsPerPage={handleChangeRowsPerPage}
                />
              )}
            </React.Fragment>
          )}
        </Grid>
      </Grid>
    </div>
  );
}
