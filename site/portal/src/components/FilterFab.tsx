import ClickAwayListener from '@material-ui/core/ClickAwayListener';
import Grow from '@material-ui/core/Grow';
import IconButton from '@material-ui/core/IconButton';
import Paper from '@material-ui/core/Paper';
import Popper from '@material-ui/core/Popper';
import { makeStyles } from '@material-ui/core/styles';
import FilterListIcon from '@material-ui/icons/FilterList';
import React from 'react';

const useStyles = makeStyles((theme: any) => ({
  paper: {
    marginTop: theme.spacing(1),
    minWidth: 220,
  },
}));

function FilterFab({ children }: any) {
  const classes = useStyles();
  const [open, setOpen] = React.useState(false);
  const anchorRef = React.useRef<HTMLButtonElement>(null);

  const handleToggle = () => {
    setOpen((prevOpen) => !prevOpen);
  };

  const handleClose = (event: React.MouseEvent<EventTarget>) => {
    if (
      (anchorRef.current && anchorRef.current.contains(event.target as HTMLElement)) ||
      (event.target as HTMLElement).nodeName === 'BODY' ||
      ((event.target as HTMLElement).classList &&
        (event.target as HTMLElement).classList.contains('fusebit-prevent-clickaway'))
    ) {
      return false;
    }

    setOpen(false);
    return true;
  };

  // return focus to the button when we transitioned from !open -> open
  const prevOpen = React.useRef(open);
  React.useEffect(() => {
    if (prevOpen.current === true && open === false) {
      anchorRef.current!.focus();
    }

    prevOpen.current = open;
  }, [open]);

  return (
    <div>
      <IconButton
        ref={anchorRef}
        aria-controls={open ? 'menu-list-grow' : undefined}
        aria-haspopup="true"
        onClick={handleToggle}
      >
        <FilterListIcon />
      </IconButton>
      <Popper open={open} anchorEl={anchorRef.current} role={undefined} transition placement="bottom-end">
        {({ TransitionProps, placement }) => (
          <Grow
            {...TransitionProps}
            style={{
              transformOrigin: placement === 'bottom' ? 'center top' : 'center bottom',
            }}
          >
            <Paper className={classes.paper}>
              <ClickAwayListener onClickAway={handleClose}>
                <div>{children}</div>
              </ClickAwayListener>
            </Paper>
          </Grow>
        )}
      </Popper>
    </div>
  );
}

export default FilterFab;
