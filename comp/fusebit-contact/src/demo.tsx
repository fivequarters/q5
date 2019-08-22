import React from 'react';
import ReactDOM from 'react-dom';
import { Box } from '@5qtrs/box';
import { FusebitColor } from '@5qtrs/fusebit-color';
import { FusebitEmail, FusebitAboutYou } from './index';

const App = () => (
  <Box margin={-20} width="calc(100% + 40px)">
    <Box vertical background={FusebitColor.lightBlue} padding={20} width="100%">
      <FusebitEmail width="100%" />
      <Box height={50} />
      <FusebitAboutYou width="100%" email="randall-test@fusebit.io" />
    </Box>
  </Box>
);

ReactDOM.render(<App />, document.getElementById('app'));
