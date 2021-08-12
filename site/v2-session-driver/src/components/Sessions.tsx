import React from 'react';
import LaunchIcon from '@material-ui/icons/Launch';
import { ILocalStorage } from '../api/LocalStorage';
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
  sessions: ILocalStorage[];
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
            <StyledTableCell>ID</StyledTableCell>
            <StyledTableCell>Tenant</StyledTableCell>
            <StyledTableCell>URL</StyledTableCell>
            <StyledTableCell>Actions</StyledTableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {sessions?.map((sessionItem: ILocalStorage) => (
            <TableRow key={sessionItem.sessionId}>
              <TableCell component="th" scope="row">
                {sessionItem.sessionId}
              </TableCell>
              <TableCell>{sessionItem.tenantId}</TableCell>
              <TableCell>{sessionItem.integrationBaseUrl}</TableCell>
              <TableCell>
                <Button variant="contained" color="secondary">
                  <LaunchIcon fontSize="small" />
                  Navigate
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
