import React from 'react';
import { makeStyles, Paper, TableContainer, Table, TableHead, TableRow, TableCell, TableBody, TableFooter, CircularProgress, createStyles, IconButton, TablePagination } from '@material-ui/core';
import clsx from 'clsx';
import FirstPageIcon from '@material-ui/icons/FirstPage';
import KeyboardArrowLeft from '@material-ui/icons/KeyboardArrowLeft';
import KeyboardArrowRight from '@material-ui/icons/KeyboardArrowRight';
import LastPageIcon from '@material-ui/icons/LastPage';
import { BaseMolecule } from '../../types/entities';

const useStyles = makeStyles(theme => ({
  root: {
    padding: theme.spacing(2),
  },
  paperRoot: {
    width: '100%',
  },
  container: {
    maxHeight: '80vh',
  },
}));


interface Column {
  id: 'name' | 'alias' | 'category' | 'created_at';
  label: string;
  minWidth?: number;
  align?: 'right';
  format?: (value: any) => string;
}

const columns: Column[] = [
  { id: 'name', label: 'Name', minWidth: 170 },
  { id: 'alias', label: 'Alias', minWidth: 100 },
  {
    id: 'category',
    label: 'Category',
    minWidth: 170,
    align: 'right',
  },
  {
    id: 'created_at',
    label: 'Created at',
    minWidth: 170,
    align: 'right',
    format: (value: string) => new Date(value).toISOString(),
  },
];

export default function MoleculeTable(props: {
  loading?: boolean,
  molecules: BaseMolecule[],
  length: number,
  rowsPerPage: number,
  page: number,
  onChangePage: (page: number) => void,
}) {
  const classes = useStyles();
  const { loading, molecules, length, rowsPerPage, page, onChangePage } = props;

  return (
    <div className={classes.root}>
      <Paper className={classes.paperRoot}>
        <TableContainer className={classes.container}>
          <Table stickyHeader aria-label="sticky table">
            <TableHead className={clsx("can-load", loading && "in")}>
              <TableRow>
                {columns.map(column => (
                  <TableCell
                    key={column.id}
                    align={column.align}
                    style={{ minWidth: column.minWidth }}
                  >
                    {column.label}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody className={clsx("can-load", loading && "in")}>
              {molecules.map(row => {
                return (
                  <TableRow hover role="checkbox" tabIndex={-1} key={row.id}>
                    {columns.map(column => {
                      const value = row[column.id];
                      return (
                        <TableCell key={column.id} align={column.align}>
                          {column.format && typeof value === 'number' ? column.format(value) : value}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })}
            </TableBody>

            <TableFooter>
              <TableRow>
                {/* Loading indicator */}
                {loading && <TableCell style={{ lineHeight: '1', display: 'flex', alignItems: 'center' }}>
                  <CircularProgress size={20} /> <span style={{ marginLeft: 12 }}>
                    <em>Loading...</em>
                  </span>
                </TableCell>}
                
                <TablePagination
                  count={length}
                  rowsPerPage={rowsPerPage}
                  rowsPerPageOptions={[rowsPerPage]}
                  page={length ? page : 0}
                  className={clsx("can-load", loading && "in")}
                  onChangePage={(_, page) => {
                    onChangePage(page);
                  }}
                  ActionsComponent={TablePaginationActions}
                />
              </TableRow>
            </TableFooter>
          </Table>
        </TableContainer>
      </Paper>
    </div>
  );
}

// Custom table pagination
interface TablePaginationActionsProps {
  count: number;
  page: number;
  rowsPerPage: number;
  onChangePage: (event: React.MouseEvent<HTMLButtonElement>, newPage: number) => void;
}

const useStylesTablePagination = makeStyles(theme =>
  createStyles({
    root: {
      flexShrink: 0,
      marginLeft: theme.spacing(2.5),
    },
  }),
);

function TablePaginationActions(props: TablePaginationActionsProps) {
  const classes = useStylesTablePagination();
  const { count, page, rowsPerPage, onChangePage } = props;

  const handleFirstPageButtonClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    onChangePage(event, 0);
  };

  const handleBackButtonClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    onChangePage(event, page - 1);
  };

  const handleNextButtonClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    onChangePage(event, page + 1);
  };

  const handleLastPageButtonClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    onChangePage(event, Math.max(0, Math.ceil(count / rowsPerPage) - 1));
  };

  return (
    <div className={classes.root}>
      <IconButton
        onClick={handleFirstPageButtonClick}
        disabled={page === 0}
        aria-label="first page"
      >
        <FirstPageIcon />
      </IconButton>
      <IconButton onClick={handleBackButtonClick} disabled={page === 0}>
        <KeyboardArrowLeft />
      </IconButton>
      <IconButton
        onClick={handleNextButtonClick}
        disabled={page >= Math.ceil(count / rowsPerPage) - 1}
        aria-label="next page"
      >
        <KeyboardArrowRight />
      </IconButton>
      <IconButton
        onClick={handleLastPageButtonClick}
        disabled={page >= Math.ceil(count / rowsPerPage) - 1}
        aria-label="last page"
      >
        <LastPageIcon />
      </IconButton>
    </div>
  );
}