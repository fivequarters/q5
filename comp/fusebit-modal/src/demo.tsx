import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { Box } from '@5qtrs/box';
import { FusebitButton } from '@5qtrs/fusebit-button';
import { FusebitColor } from '@5qtrs/fusebit-color';
import { FusebitModal, FusebitModalPage } from './index';

const App = () => {
  const [show, setShow] = useState(false);
  const [page, setPage] = useState(FusebitModalPage.ContactUs);

  function toggleModal() {
    setShow(!show);
  }

  function getButtonClick(page: FusebitModalPage) {
    return function() {
      setPage(page);
      toggleModal();
    };
  }

  return (
    <Box vertical height={1000} background={FusebitColor.lightBlue} margin={-20} padding={20}>
      <FusebitModal modalPage={page} show={show} onClose={toggleModal} />
      <Box vertical gap={20}>
        <FusebitButton onClick={getButtonClick(FusebitModalPage.ContactUs)}>Let's Talk</FusebitButton>
        <FusebitButton onClick={getButtonClick(FusebitModalPage.ContactUsAboutYou)}>Follow Up</FusebitButton>
      </Box>
    </Box>
  );
};

ReactDOM.render(<App />, document.getElementById('app'));
