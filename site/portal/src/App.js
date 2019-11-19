import React from "react";
import { Router, Route, Switch } from "react-router-dom";
import "./App.css";

function App() {
  return (
    <Router history={hist}>
      <Switch>
        <Route path="/start/:config" component={Start} />
        <Route path="/" component={AccountAdmin} />
      </Switch>
    </Router>
  );
  return (
    <div className="App">
      <header className="App-header">
        {/* <img src={logo} className="App-logo" alt="logo" /> */}
        <p>Future home of Fusebit portal.</p>
        <a
          className="App-link"
          href="https://fusebit.io"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn about Fusebit
        </a>
      </header>
    </div>
  );
}

export default App;
