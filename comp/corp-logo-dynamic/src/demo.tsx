import React from 'react';
import ReactDOM from 'react-dom';
import { CorpLogoDynamic } from './CorpLogoDynamic';

const App = () => <CorpLogoDynamic size={100} visible={true} />;

ReactDOM.render(<App />, document.getElementById('app'));
