import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { Modal } from './index';
import { Box } from '@5qtrs/box';

const App = () => {
  const [show, setShow] = useState(false);

  function modalClick() {
    setShow(false);
  }

  function buttonClick() {
    setShow(true);
  }

  function ignoreClick(event: any) {
    event.stopPropagation();
  }

  return (
    <Box height={1000} margin={-20} padding={20} background="#F9E79F">
      <Modal show={show} background="#76D7C4" onClick={modalClick}>
        <Box background="white" width={200} height={200} padding={30} onClick={ignoreClick} >
          Click outside to close
        </Box>
      </Modal>
      <button onClick={buttonClick}>Click here to open the modal</button>
    </Box>
  );
};

ReactDOM.render(<App />, document.getElementById('app'));
