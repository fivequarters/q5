import React from "react";
import { Router, Route, Switch } from "react-router-dom";
import { createBrowserHistory } from "history";
import Init from "./Init";
import Admin from "./Admin";
import Me from "./Me";
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
              <Switch>
                <Route path="/me" component={Me} />
                <Route path="/" component={Admin} />
              </Switch>
            </ProfileProvider>
          </Switch>
        </Router>
      </ErrorBoundary>
    </ThemeProvider>
  );
}

export default App;
