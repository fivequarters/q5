import React from 'react';
import Container from '@material-ui/core/Container';
import Typography from '@material-ui/core/Typography';
import Box from '@material-ui/core/Box';
import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import IconButton from '@material-ui/core/IconButton';
import MenuIcon from '@material-ui/icons/Menu';
import { makeStyles } from '@material-ui/core/styles';
import { IntegrationGrid } from '../components/IntegrationGrid';
import { ReactElement } from 'react';

const useStyles = makeStyles((theme) => ({
  root: {
    flexGrow: 1,
  },
  menuButton: {
    marginRight: theme.spacing(2),
  },
  title: {
    flexGrow: 1,
  },
}));

export function Integrations(): ReactElement {
  const classes = useStyles();
  const handleClick = (event: React.MouseEvent) => {
    console.log('clicked', event);
  };

  const integrations = [
    {
      displayName: 'my slack app',
      integrationTypeDescription: 'my slack description',
      description: 'my slack description',
      logo: '/slack-logo.jpeg',
      onCreateClick: handleClick,
      onDeleteClick: handleClick,
    },
    {
      displayName: 'my slack app',
      integrationTypeDescription: 'my slack description',
      description: 'my slack description',
      logo: '/slack-logo.jpeg',
      onCreateClick: handleClick,
      onDeleteClick: handleClick,
    },
  ];
  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <IconButton edge="start" className={classes.menuButton} color="inherit" aria-label="menu">
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" className={classes.title}>
            <img src="/fusebit.svg" />
          </Typography>
        </Toolbar>
      </AppBar>
      <Container>
        <Box my={4}>
          <IntegrationGrid integrations={integrations} />
        </Box>
      </Container>
    </>
  );
}
