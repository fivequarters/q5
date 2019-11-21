import { createMuiTheme } from "@material-ui/core/styles";

const ColorFusebitRed = "#FB310A";
const ColorFusebitOrange = "#FFA700";

const FusebitTheme = {
  ...createMuiTheme({
    // Overrides of default MUI theme:
    palette: {
      primary: {
        main: ColorFusebitRed
      },
      secondary: {
        main: ColorFusebitOrange
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
    colors: {
      red: ColorFusebitRed,
      orange: ColorFusebitOrange
    }
  }
};

export default FusebitTheme;
