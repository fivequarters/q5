import React from 'react';
import ReactDOM from 'react-dom';
import ScrollMemory from 'react-router-scroll-memory';

import { Account, Callback, Home, Integrations, Start } from './pages';
import { BrowserRouter, Route, Switch } from 'react-router-dom';
import { Test } from './pages/Test';

const App = () => {
  return (
    <BrowserRouter basename="/">
      <ScrollMemory />
      <Switch>
        <Route path="/account" component={Account} />
        <Route path="/start" component={Start} />
        <Route path="/callback" component={Callback} />
        <Route path="/test/:sessionId" component={Test} />
        <Route path="/" component={Home} />
      </Switch>
    </BrowserRouter>
  );
};
ReactDOM.render(<App />, document.getElementById('app'));
