import React from 'react';
import ReactDOM from 'react-dom';
import { MediaQuery, MediaType } from './MediaQuery';

const App = () => (
  <>
    <MediaQuery mediaType={MediaType.mobile}>
      <h1>I'm Mobile!</h1>
    </MediaQuery>
    <MediaQuery mediaType={MediaType.allExceptMobile}>
      <h1>I'm Not Mobile!</h1>
    </MediaQuery>
  </>
);

ReactDOM.render(<App />, document.getElementById('app'));
