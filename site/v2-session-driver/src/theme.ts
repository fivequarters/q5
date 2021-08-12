import { createMuiTheme } from '@material-ui/core/styles';
import red from '@material-ui/core/colors/red';

const theme = createMuiTheme({
  palette: {
    primary: {
      main: red[900],
    },
    secondary: {
      main: red[400],
    },
  },
});

export default theme;
