import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { Modal } from './Modal';

const App = () => {
  const [visible, setVisible] = useState(false);

  const outerStyle = { height: 5000, backgroundColor: '#F9E79F' };
  const modalStyle = { backgroundColor: '#76D7C4' };
  const innerStyle = { backgroundColor: 'white', width: 200, height: 200, padding: 30 };

  function modalClick() {
    setVisible(false);
  }

  function buttonClick() {
    setVisible(true);
  }

  return (
    <div style={outerStyle}>
      <Modal visible={visible} style={modalStyle} onClick={modalClick}>
        <div
          style={innerStyle}
          onClick={event => {
            event.stopPropagation();
          }}
        >
          Click outside to close
        </div>
      </Modal>
      <button onClick={buttonClick}>Click here to open the modal</button>
    </div>
  );
};

ReactDOM.render(<App />, document.getElementById('app'));
