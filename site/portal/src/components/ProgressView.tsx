import React from 'react';
import { CircularProgress, Grid } from '@material-ui/core';

function ProgressView({ ...rest }: any) {
  return (
    <Grid item container xs={12} style={{ width: '100%', height: '90vh' }} justify="center" alignItems="center">
      <CircularProgress {...rest} />
    </Grid>
  );
}

export default ProgressView;
