import React from 'react';
import { makeStyles } from '@material-ui/core/styles';
import Avatar from '@material-ui/core/Avatar';
import clsx from 'clsx';

const useStyles = makeStyles((theme: any) => ({
  container: (props: any) => ({
    position: 'relative',
    // backgroundColor: theme.fusebit.colors.black,
    width: 38,
    height: 38,
  }),
  avatar: (props: any) => ({
    position: 'relative',
    backgroundColor: theme.fusebit.colors.black,
    top: 2,
    left: 2,
    width: 32,
    height: 32,
    margin: 0,
  }),
  circle: (props: any) => ({
    // backgroundColor: "blue",
    position: 'absolute',
    top: 2,
    left: 2,
    width: 32,
    height: 32,
    borderRadius: '50%',
  }),
  innerCircle: {
    backgroundColor: 'transparent',
    borderRadius: '50%',
    overflow: 'hidden',
  },
  arc: {
    overflow: 'hidden',
    position: 'absolute',
    /* make sure top & left values are - the width of the border */
    /* the bottom right corner is the centre of the parent circle */
    top: -4,
    right: '50%',
    bottom: '50%',
    left: -4,
    /* the transform origin is the bottom right corner */
    transformOrigin: '100% 100%',
    /* rotate by any angle */
    /* the skew angle is 90deg - the angle you want for the arc */
    transform: 'rotate(90deg) skewX(10deg)',
    '&::before': {
      boxSizing: 'border-box',
      display: 'block',
      border: `solid 3px ${theme.fusebit.colors.red}`,
      width: '200%',
      height: '200%',
      borderRadius: '50%',
      transform: 'skewX(-10deg)',
      content: "''",
    },
  },
}));

function SelectableAvatar({ className, size, selected, children, ...rest }: any) {
  const classes = useStyles({ selected });

  return (
    <div className={classes.container}>
      <Avatar className={clsx(classes.avatar, className)} {...rest}>
        {children}
      </Avatar>
      <div className={classes.circle}>
        <div className={classes.innerCircle}></div>
        {selected && <div className={classes.arc}> </div>}
      </div>
    </div>
  );
}

export default SelectableAvatar;
