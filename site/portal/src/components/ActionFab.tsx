import Fab from "@material-ui/core/Fab";
import { makeStyles } from "@material-ui/core/styles";
import BuildIcon from "@material-ui/icons/Build";
import React from "react";
import ClickAwayListener from "@material-ui/core/ClickAwayListener";
import Grow from "@material-ui/core/Grow";
import Paper from "@material-ui/core/Paper";
import Popper from "@material-ui/core/Popper";
import MenuItem from "@material-ui/core/MenuItem";
import MenuList from "@material-ui/core/MenuList";
import Typography from "@material-ui/core/Typography";
import DialogContentText from "@material-ui/core/DialogContentText";

const useStyles = makeStyles((theme: any) => ({
  icon: {
    color: "white"
  },
  paper: {
    minWidth: 422
  },
  header: {
    padding: theme.spacing(2),
    paddingBottom: 0
  }
}));

function ActionFab({ title, subtitle, actions }: any) {
  const classes = useStyles();
  const [open, setOpen] = React.useState(false);
  const anchorRef = React.useRef<HTMLButtonElement>(null);

  const handleToggle = () => {
    setOpen(prevOpen => !prevOpen);
  };

  const handleClose = (event: React.MouseEvent<EventTarget>) => {
    if (
      anchorRef.current &&
      anchorRef.current.contains(event.target as HTMLElement)
    ) {
      return false;
    }

    setOpen(false);
    return true;
  };

  const handleSelection = (handler: any) => (
    event: React.MouseEvent<EventTarget>
  ) => handleClose(event) && handler && handler();

  function handleListKeyDown(event: React.KeyboardEvent) {
    if (event.key === "Tab") {
      event.preventDefault();
      setOpen(false);
    }
  }

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
      <Fab
        color="secondary"
        ref={anchorRef}
        aria-controls={open ? "menu-list-grow" : undefined}
        aria-haspopup="true"
        onClick={handleToggle}
      >
        <BuildIcon className={classes.icon} />
      </Fab>
      <Popper
        open={open}
        anchorEl={anchorRef.current}
        role={undefined}
        transition
        // disablePortal
        placement="bottom-end"
      >
        {({ TransitionProps, placement }) => (
          <Grow
            {...TransitionProps}
            style={{
              transformOrigin:
                placement === "bottom" ? "center top" : "center bottom"
            }}
          >
            <Paper className={classes.paper}>
              <ClickAwayListener onClickAway={handleClose}>
                <div>
                  {(title || subtitle) && (
                    <div className={classes.header}>
                      {title && <Typography variant="h6">{title}</Typography>}
                      {subtitle && (
                        <DialogContentText>{subtitle}</DialogContentText>
                      )}
                    </div>
                  )}
                  <MenuList
                    autoFocusItem={open}
                    id="menu-list-grow"
                    onKeyDown={handleListKeyDown}
                  >
                    {actions.map((a: any) => (
                      <MenuItem
                        key={a.name}
                        onClick={handleSelection(a.handler)}
                      >
                        <Typography variant="button">{a.name}</Typography>
                      </MenuItem>
                    ))}
                  </MenuList>
                </div>
              </ClickAwayListener>
            </Paper>
          </Grow>
        )}
      </Popper>
    </div>
  );
}

export default ActionFab;
