import React from 'react';
import ReactDOM from 'react-dom';
import { Box } from '@5qtrs/box';
import { FusebitPage } from './index';

const App = () => (
  <Box>
    <FusebitPage>
      <h1>Hello</h1>
    </FusebitPage>
  </Box>
);

ReactDOM.render(<App />, document.getElementById('app'));
