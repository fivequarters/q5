import { createMuiTheme } from '@material-ui/core/styles';
import { FusebitColor } from '@5qtrs/fusebit-color';

const FusebitTheme = {
  ...createMuiTheme({
    // Overrides of default MUI theme:
    typography: {
      fontFamily: '"Nunito Sans", sans-serif',
      subtitle1: {
        fontFamily: '"Poppins", sans-serif',
      },
      subtitle2: {
        fontFamily: '"Poppins", sans-serif',
      },
      button: {
        fontFamily: '"Poppins", sans-serif',
      },
    },
    palette: {
      primary: {
        main: FusebitColor.red,
      },
      secondary: {
        main: FusebitColor.orange,
      },
      error: {
        main: FusebitColor.systemError,
      },
      warning: {
        main: FusebitColor.systemWarning,
      },
      info: {
        main: FusebitColor.systemNormal,
      },
      success: {
        main: FusebitColor.systemSuccess,
      },
    },
    overrides: {
      MuiButton: {
        root: {
          borderRadius: '100px',
        },
      },
      MuiDialogActions: {
        root: {
          paddingLeft: 24,
          paddingRight: 24,
          paddingBottom: 16,
        },
      },
    },
  }),
  // Additional, Fusebit-specific theme properties  :
  fusebit: {
    colors: FusebitColor,
    profileSelector: {
      width: 240,
      iconColors: [FusebitColor.red, FusebitColor.orange, FusebitColor.cyan, FusebitColor.gray],
    },
  },
};

export default FusebitTheme;
