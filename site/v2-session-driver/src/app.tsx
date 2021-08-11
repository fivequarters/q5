import React from 'react';
import ReactDOM from 'react-dom';
import ScrollMemory from 'react-router-scroll-memory';

import { Integrations, Start } from './pages';
import { BrowserRouter, Route, Switch } from 'react-router-dom';

const App = () => {
  return (
    <BrowserRouter basename="/">
      <ScrollMemory />
      <Switch>
        <Route path="/integration" component={Integrations} />
        <Route path="/" exact component={Start} />
      </Switch>
    </BrowserRouter>
  );
};
ReactDOM.render(<App />, document.getElementById('app'));
