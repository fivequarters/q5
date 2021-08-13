import React from 'react';
import { IIntegration } from '../api/LocalStorage';
import Integration from './Integration';
import { Paper, Table, TableHead, TableBody, TableCell, TableContainer, TableRow, withStyles } from '@material-ui/core';

export interface IIntegrationsProps {
  integrations: IIntegration[];
  onDeleteClick(integrationId: string): void;
}

const StyledTableCell = withStyles((theme) => ({
  head: {
    backgroundColor: theme.palette.common.black,
    color: theme.palette.common.white,
  },
}))(TableCell);

// Render existing integrations
export default function Integrations({ integrations, onDeleteClick }: IIntegrationsProps) {
  return (
    <TableContainer component={Paper}>
      <Table aria-label="integrations">
        <TableHead>
          <TableRow>
            <StyledTableCell>Integration name</StyledTableCell>
            <StyledTableCell align="center">Actions</StyledTableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {integrations?.map((integration: IIntegration) => {
            return (
              <Integration key={integration.integrationId} integration={integration} onDeleteClick={onDeleteClick} />
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
