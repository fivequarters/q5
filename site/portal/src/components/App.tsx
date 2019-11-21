import React from "react";
import { Router, Route, Switch } from "react-router-dom";
import { createBrowserHistory } from "history";
import Init from "./Init";
import Admin from "./Admin";
import ErrorBoundary from "./ErrorBoundary";
import Style from "./Style";
import { ProfileProvider } from "./ProfileProvider";
import CssBaseline from "@material-ui/core/CssBaseline";
import { ThemeProvider } from "@material-ui/core/styles";
import FusebitTheme from "../styles/FusebitTheme";

const history = createBrowserHistory();

function App() {
  return (
    <ThemeProvider theme={FusebitTheme}>
      <CssBaseline />
      <ErrorBoundary>
        <Router history={history}>
          <Switch>
            <Route path="/init" component={Init} />
            <Route path="/style" component={Style} />
            <ProfileProvider>
              <Route path="/" component={Admin} />
            </ProfileProvider>
          </Switch>
        </Router>
      </ErrorBoundary>
    </ThemeProvider>
  );
}

export default App;
