import React from 'react';
import ReactDOM from 'react-dom';
import { Box } from '@5qtrs/box';
import { FusebitCard } from './index';

const App = () => (
  <Box vertical>
    <Box gap={20}>
      <FusebitCard width={200} height={200} />
      <FusebitCard width={500} height={200} />
      <FusebitCard width={150} height={200} />
    </Box>
    <Box gap={20}>
      <FusebitCard width={200} height={200} inActive />
      <FusebitCard width={500} height={200} inActive />
      <FusebitCard width={150} height={200} inActive />
    </Box>
  </Box>
);

ReactDOM.render(<App />, document.getElementById('app'));
