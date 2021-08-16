import React, { useState } from 'react';
import { FormControl, InputLabel, Select, MenuItem, makeStyles, Button } from '@material-ui/core';
import { Alert } from '@material-ui/lab';
import { Link } from 'react-router-dom';
import { IIntegration, listIntegrations } from '../api/LocalStorage';

export interface IIntegrationSelectorProps {
  onSelectIntegration?(integrationId: string): void;
}

const useStyles = makeStyles((theme) => ({
  formControl: {
    margin: theme.spacing(1),
    minWidth: 300,
  },
}));

const renderMenuItem = (integration: IIntegration) => {
  return <MenuItem value={integration.integrationId}>{integration.integrationId}</MenuItem>;
};

export default function IntegrationSelector({ onSelectIntegration }: IIntegrationSelectorProps) {
  const styles = useStyles();
  const integrations = listIntegrations();
  const [selectedIntegration, setSelectedIntegration] = useState('');
  const onSelectChange = (
    event: React.ChangeEvent<{
      name?: string | undefined;
      value: unknown;
    }>
  ) => {
    setSelectedIntegration(event.target.value as string);
    onSelectIntegration && onSelectIntegration(event.target.value as string);
  };
  return (
    <>
      <FormControl>
        <InputLabel id="integration-label">Select integration</InputLabel>
        <Select
          labelId="intgration-selector"
          id="integration-selector"
          className={styles.formControl}
          value={selectedIntegration}
          onChange={onSelectChange}
        >
          <MenuItem value="">
            <em>None</em>
          </MenuItem>
          {integrations.map((integration: IIntegration) => renderMenuItem(integration))}
        </Select>
        {!integrations?.length && (
          <Alert severity="warning">
            No integrations found, please add yours
            <Link to={'/account'}>
              <Button>Click here</Button>
            </Link>
          </Alert>
        )}
      </FormControl>
    </>
  );
}
