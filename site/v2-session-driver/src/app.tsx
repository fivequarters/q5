import React from 'react';
import ReactDOM from 'react-dom';
import ScrollMemory from 'react-router-scroll-memory';
import { Account, Callback, Home, Integrations, Users } from './pages';
import { BrowserRouter, Route, Switch } from 'react-router-dom';
import { Test } from './pages/Test';
import TopMenu from './components/TopMenu';
import CssBaseline from '@material-ui/core/CssBaseline';
import { ThemeProvider } from '@material-ui/core/styles';
import theme from './theme';

const App = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <TopMenu>
        <BrowserRouter basename="/">
          <ScrollMemory />
          <Switch>
            <Route path="/integrations" component={Integrations} />
            <Route path="/account" component={Account} />
            <Route path="/users" component={Users} />
            <Route path="/callback" component={Callback} />
            <Route path="/test/:sessionId" component={Test} />
            <Route path="/" component={Home} />
          </Switch>
        </BrowserRouter>
      </TopMenu>
    </ThemeProvider>
  );
};
ReactDOM.render(<App />, document.getElementById('app'));
