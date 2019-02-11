import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { Modal } from './Modal';

const App = () => {
  const [visible, setVisible] = useState(false);

  return (
    <div style={{ height: 5000, backgroundColor: '#F9E79F' }}>
      <Modal visible={visible} style={{ backgroundColor: '#76D7C4' }} onClick={() => setVisible(false)}>
        <div style={{ backgroundColor: 'white', width: 200, height: 200, padding: 30 }}>Click outside to close</div>
      </Modal>
      <button onClick={() => setVisible(true)}>Click here to open the modal</button>
    </div>
  );
};

ReactDOM.render(<App />, document.getElementById('app'));
