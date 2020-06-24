import { FusebitColor } from '@5qtrs/fusebit-color';
import { FusebitMark } from '@5qtrs/fusebit-mark';
import Button from '@material-ui/core/Button';
import Grid from '@material-ui/core/Grid';
import Icon from '@material-ui/core/Icon';
import IconButton from '@material-ui/core/IconButton';
import InputAdornment from '@material-ui/core/InputAdornment';
import ProgressView from './ProgressView';
import { makeStyles } from '@material-ui/core/styles';
import TextField from '@material-ui/core/TextField';
import FileCopyIcon from '@material-ui/icons/FileCopy';
import LinkIcon from '@material-ui/icons/Link';
import OpenInNewIcon from '@material-ui/icons/OpenInNew';
import React from 'react';
import { useFunction } from './FunctionProvider';
import InputWithIcon from './InputWithIcon';
import PortalError from './PortalError';

const useStyles = makeStyles((theme) => ({
  gridContainer: {
    marginLeft: theme.spacing(2),
    marginRight: theme.spacing(2),
    marginBottom: theme.spacing(2),
    marginTop: theme.spacing(2),
  },
  tile: {
    marginLeft: theme.spacing(3),
  },
}));

function FunctionOverview() {
  const classes = useStyles();
  const [func] = useFunction();

  const template = func.status === 'ready' && func.existing.metadata && func.existing.metadata.template;

  return (
    <Grid container className={classes.gridContainer}>
      {func.status === 'error' && (
        <Grid item xs={12}>
          <PortalError error={func.error} />
        </Grid>
      )}
      {(func.status === 'updating' || func.status === 'loading') && <ProgressView />}
      {func.status === 'ready' && (
        <Grid item xs={8}>
          <InputWithIcon icon={<LinkIcon />}>
            <TextField
              label="Function base URL"
              // margin="dense"
              variant="outlined"
              value={func.existing.location}
              fullWidth
              disabled={true}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => func.existing.location && navigator.clipboard.writeText(func.existing.location)}
                      color="inherit"
                    >
                      <FileCopyIcon fontSize="inherit" />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </InputWithIcon>
          {template && (
            <InputWithIcon
              icon={
                template.icon ? (
                  <Icon>{template.icon}</Icon>
                ) : (
                  <FusebitMark size={24} margin={0} color={FusebitColor.black} />
                )
              }
            >
              <TextField
                label="Function template"
                // margin="dense"
                variant="outlined"
                value={template.name}
                fullWidth
                disabled={true}
                InputProps={
                  template.documentationUrl && {
                    endAdornment: (
                      <InputAdornment position="end">
                        <Button variant="text" color="primary" href={template.documentationUrl} target="_blank">
                          Learn&nbsp;more&nbsp;
                          <OpenInNewIcon />
                        </Button>
                      </InputAdornment>
                    ),
                  }
                }
              />
            </InputWithIcon>
          )}
        </Grid>
      )}
    </Grid>
  );
}

export default FunctionOverview;
