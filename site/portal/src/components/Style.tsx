import React from 'react';
import { makeStyles } from '@material-ui/core/styles';
import Container from '@material-ui/core/Container';
import Grid from '@material-ui/core/Grid';
import Button from '@material-ui/core/Button';
import Typography from '@material-ui/core/Typography';
import Tabs from '@material-ui/core/Tabs';
import Tab from '@material-ui/core/Tab';
import Paper from '@material-ui/core/Paper';

const useStyles = makeStyles((theme) => ({
  button: {
    margin: theme.spacing(1),
  },
}));

type ButtonVariants = 'text' | 'contained' | 'outlined';
type ButtonSizes = 'small' | 'medium' | 'large';

function Style() {
  const classes = useStyles();
  return (
    <Container>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Typography variant="h5" paragraph={true}>
            Buttons
          </Typography>
          {['text', 'contained', 'outlined'].map((variant) =>
            ['small', 'medium', 'large'].map((size) => (
              <React.Fragment key={`${variant}-${size}`}>
                <Typography paragraph={true}>
                  {variant} - {size}
                </Typography>
                <Button
                  variant={variant as ButtonVariants}
                  color="default"
                  className={classes.button}
                  size={size as ButtonSizes}
                >
                  Default
                </Button>
                <Button
                  variant={variant as ButtonVariants}
                  color="primary"
                  className={classes.button}
                  size={size as ButtonSizes}
                >
                  Primary
                </Button>
                <Button
                  variant={variant as ButtonVariants}
                  color="secondary"
                  className={classes.button}
                  size={size as ButtonSizes}
                >
                  Secondary
                </Button>
              </React.Fragment>
            ))
          )}
        </Grid>
        <Grid item xs={12}>
          <Typography variant="h5" paragraph={true}>
            Tabs
          </Typography>
          <Paper>
            <Tabs value="selected" indicatorColor="primary" textColor="primary">
              <Tab label="Selected" value="selected" />
              <Tab label="Disabled" disabled />
              <Tab label="Active" />
            </Tabs>
          </Paper>
          <br />
          <Paper>
            <Tabs value="selected" indicatorColor="secondary" textColor="secondary">
              <Tab label="Selected" value="selected" />
              <Tab label="Disabled" disabled />
              <Tab label="Active" />
            </Tabs>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
}

export default Style;
