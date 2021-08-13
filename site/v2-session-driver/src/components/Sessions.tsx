import React from 'react';
import { ISession } from '../api/LocalStorage';
import Session from './Session';
import {
  Paper,
  Button,
  Table,
  TableHead,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  withStyles,
} from '@material-ui/core';

export interface ISessionsProps {
  sessions: ISession[];
}

const StyledTableCell = withStyles((theme) => ({
  head: {
    backgroundColor: theme.palette.common.black,
    color: theme.palette.common.white,
  },
}))(TableCell);

// Render existing sessions
export default function Sessions({ sessions }: ISessionsProps) {
  return (
    <TableContainer component={Paper}>
      <Table aria-label="sessions">
        <TableHead>
          <TableRow>
            <StyledTableCell>Tenant</StyledTableCell>
            <StyledTableCell>Integration</StyledTableCell>
            <StyledTableCell>Actions</StyledTableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {sessions?.map((sessionItem: ISession) => {
            return <Session session={sessionItem} />;
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
