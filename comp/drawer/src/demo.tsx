import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { Box } from '@5qtrs/box';
import { Drawer } from './index';

const App = () => {
  const [open, setOpen] = useState(true);

  function onClick() {
    setOpen(!open);
  }

  return (
    <Box gap={20}>
      <Box background="blue" height={500} width={500} onClick={onClick}>
        <Drawer stretch background="red" width={200} open={open}>
          <Box width={200} gap={30}>
            <Box width={50} height={50} background="yellow" />
            <Box width={50} height={50} background="yellow" />
            <Box width={50} height={50} background="yellow" />
            <Box width={50} height={50} background="yellow" />
            <Box width={50} height={50} background="yellow" />
            <Box width={50} height={50} background="yellow" />
          </Box>
        </Drawer>
      </Box>
    </Box>
  );
};

ReactDOM.render(<App />, document.getElementById('app'));
