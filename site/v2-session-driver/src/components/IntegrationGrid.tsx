import React, { ReactElement } from 'react';
import Grid from '@material-ui/core/Grid';
import { IntegrationProps, IntegrationTemplate } from './IntegrationTemplate';

export function IntegrationGrid({ integrations }: { integrations: IntegrationProps[] }): ReactElement {
  return (
    <Grid container spacing={3}>
      {integrations.map((integration: IntegrationProps) => (
        <IntegrationTemplate key={integration.displayName} {...integration} />
      ))}
    </Grid>
  );
}
