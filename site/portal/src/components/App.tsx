import React from "react";
import { Router, Route, Switch } from "react-router-dom";
import { createBrowserHistory } from "history";
import Init from "./Init";
import Admin from "./Admin";
import ErrorBoundary from "./ErrorBoundary";
import { ProfileProvider } from "./ProfileProvider";

const history = createBrowserHistory();

function App() {
  return (
    <ErrorBoundary>
      <Router history={history}>
        <Switch>
          <Route path="/init" component={Init} />
          <ProfileProvider>
            <Route path="/" component={Admin} />
          </ProfileProvider>
        </Switch>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
