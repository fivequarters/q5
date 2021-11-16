import React from 'react';
import { TableCell, TableRow, makeStyles, Button } from '@material-ui/core';
import DeleteIcon from '@material-ui/icons/Delete';
import { IIntegration } from '../api/LocalStorage';

export interface IIntegrationProps {
  onDeleteClick(integrationId: string): void;
  integration: IIntegration;
}

const useStyles = makeStyles((theme) => ({
  th: {
    width: '100px',
  },
}));

export default function Integration({ integration, onDeleteClick }: IIntegrationProps) {
  const styles = useStyles();
  return (
    <TableRow key={integration.integrationId}>
      <TableCell component="th" scope="row">
        {integration.integrationId}
      </TableCell>
      <TableCell component="th" className={styles.th} align="center" scope="row">
        <Button onClick={() => onDeleteClick(integration.integrationId)}>
          <DeleteIcon />
        </Button>
      </TableCell>
    </TableRow>
  );
}
