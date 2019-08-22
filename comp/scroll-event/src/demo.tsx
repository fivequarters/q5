import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { ScrollEvent } from './index';

const App = () => {
  const [eventLog, setEventLog] = useState('');

  return (
    <div style={{ height: 1000 }}>
      <h1>Scroll Event 1 Below Here with Top=0</h1>
      <ScrollEvent
        top={0}
        onScrollTo={(scrollUp: boolean) => setEventLog(eventLog + `[Event 1 ${scrollUp ? 'up' : 'down'}] `)}
      />

      <div style={{ height: 100 }} />

      <h1>Scroll Event 2 Below Here with Top=300</h1>
      <ScrollEvent
        top={100}
        onScrollTo={(scrollUp: boolean) => setEventLog(eventLog + `[Event 2 ${scrollUp ? 'up' : 'down'}] `)}
      />

      <h1>Event Log</h1>
      {eventLog}
    </div>
  );
};

ReactDOM.render(<App />, document.getElementById('app'));
