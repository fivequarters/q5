import React from 'react';
import ReactDOM from 'react-dom';
import { CorpLogo } from './CorpLogo';

const App = () => (
  <>
    <CorpLogo size={50} />
    <CorpLogo size={100} />
    <CorpLogo size={200} />
  </>
);

ReactDOM.render(<App />, document.getElementById('app'));
