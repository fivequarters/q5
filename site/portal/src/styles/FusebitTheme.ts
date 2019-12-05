import { createMuiTheme } from "@material-ui/core/styles";
import { FusebitColor } from "@5qtrs/fusebit-color";

const FusebitTheme = {
  ...createMuiTheme({
    // Overrides of default MUI theme:
    palette: {
      primary: {
        main: FusebitColor.red
      },
      secondary: {
        main: FusebitColor.orange
      }
    },
    overrides: {
      MuiButton: {
        root: {
          borderRadius: "100px"
        }
      }
    }
  }),
  // Additional, Fusebit-specific theme properties  :
  fusebit: {
    colors: FusebitColor,
    profileSelector: {
      width: 240,
      iconColors: [
        FusebitColor.red,
        FusebitColor.orange,
        FusebitColor.cyan,
        FusebitColor.gray
      ]
    }
  }
};

export default FusebitTheme;
