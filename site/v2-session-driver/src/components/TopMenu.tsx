import React from 'react';
import { Toolbar, AppBar, IconButton, Typography, Box, Container } from '@material-ui/core';
import MenuIcon from '@material-ui/icons/Menu';
import { makeStyles } from '@material-ui/core/styles';

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

export type ITopMenuProps = {
  children?: React.ReactNode;
};

export default function TopMenu(props: ITopMenuProps) {
  const classes = useStyles();
  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <IconButton edge="start" className={classes.menuButton} color="inherit" aria-label="menu">
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" className={classes.title}>
            Fusebit Demo
          </Typography>
        </Toolbar>
      </AppBar>
      <Container>
        <Box my={4}>{props.children}</Box>
      </Container>
    </>
  );
}
