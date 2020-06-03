import Button from '@material-ui/core/Button';
import CardActions from '@material-ui/core/CardActions';
import CardContent from '@material-ui/core/CardContent';
import Typography from '@material-ui/core/Typography';
import ErrorIcon from '@material-ui/icons/Error';
import React from 'react';
import { FusebitError } from './ErrorBoundary';
import WarningCard from './WarningCard';
import { makeStyles } from '@material-ui/core';

const useStyles = makeStyles((theme: any) => ({
  button: {
    color: theme.palette.error.contrastText,
  },
}));

function PortalError({ error, padding }: any) {
  const fusebitError = error.fusebit ? (error as FusebitError) : undefined;
  const classes = useStyles();

  return (
    <WarningCard color="error" icon={<ErrorIcon />} padding={!!padding}>
      <CardContent>
        <Typography gutterBottom>
          <strong>{fusebitError ? fusebitError.message : 'Something went wrong'}</strong>
        </Typography>
        <Typography>{fusebitError ? fusebitError.fusebit.details : error.message}</Typography>
      </CardContent>
      {fusebitError && fusebitError.fusebit.actions && (
        <CardActions>
          {fusebitError.fusebit.actions.map((action, index) => (
            <Button
              key={index}
              href={action.url}
              onClick={action.func ? () => action.func && action.func() : undefined}
              size="small"
              className={classes.button}
            >
              {action.text}
            </Button>
          ))}
        </CardActions>
      )}
    </WarningCard>
  );
}

export default PortalError;
