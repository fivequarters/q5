import React from 'react';
import ReactDOM from 'react-dom';
import { Box } from '@5qtrs/box';
import { Body } from '@5qtrs/body'
import { FusebitSpinner } from './FusebitSpinner';
import { FusebitColor } from '@5qtrs/fusebit-color';


const App = () => (
  <Body background={FusebitColor.white}>

    <Box center middle height={200}>
      <FusebitSpinner />
    </Box>

    <Box center middle height={200}>
      <FusebitSpinner stop />
    </Box>

  </Body>
)

ReactDOM.render(<App />, document.getElementById('app'));
