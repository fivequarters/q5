import React from 'react';
import ReactDOM from 'react-dom';
import { FusebitCode, FusebitCodeLanguage } from './index';

const App = () => (
  <>
    <h1>Javascript</h1>
    <FusebitCode>{`function helloWorld() {
  const message = "Hello World";
  console.log(message);
}`}</FusebitCode>
    <h1>Typescript</h1>
    <FusebitCode language={FusebitCodeLanguage.ts}>{`function helloWorld(value:number) {
  const message:string = "Hello World";
  console.log(value, message);
}`}</FusebitCode>
    <h1>Bash</h1>
    <FusebitCode language={FusebitCodeLanguage.bash}>{`cp ./someDir ../someOtherDir
rm -r ./someDir
`}</FusebitCode>
    <h1>None</h1>
    <FusebitCode language={FusebitCodeLanguage.none}>{`fuse user add bob thomas bob.thomas@gmail.com`}</FusebitCode>
    <h1>Markup</h1>
    <FusebitCode language={FusebitCodeLanguage.markup}>{`<div>
  <h1>I am html, or so I think!</h1>
</div>`}</FusebitCode>
    <h1>CSS</h1>
    <FusebitCode language={FusebitCodeLanguage.css}>{`.id {
  background-color: #AE0000
}`}</FusebitCode>
    <h1>JSON</h1>
    <FusebitCode language={FusebitCodeLanguage.json}>{`{
  "id": 15,
  "name": "Bob",
  "values": [ true, false ]
}`}</FusebitCode>
    <h1>JSX</h1>
    <FusebitCode language={FusebitCodeLanguage.jsx}>{`<Component>{
  someCase ? null : <AnotherComponent/>
} 
</Component>`}</FusebitCode>
  </>
);

ReactDOM.render(<App />, document.getElementById('app'));
