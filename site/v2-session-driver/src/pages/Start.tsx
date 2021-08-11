import React, { ReactElement } from 'react';
// import { RedisClient } from '../../redis';

const sessionId = 'test-session';
const startingSessionValue = 1;
type SessionData = {
  id: string;
  data: number;
};

// WIP simple POC
export function Start(): ReactElement {
  const [input, setInput] = React.useState('');
  const [session, setSession] = React.useState(undefined);
  const handleInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInput(() => event.target.value);
  };
  const handleClick = (event: React.MouseEvent) => {
    console.log('clicked', event);
  };
  const handleSaveSession = async (event: React.MouseEvent) => {};
  return (
    <div>
      <button onClick={handleClick}> Start Session</button>
      <input onChange={handleInput} />
      <button onClick={handleSaveSession}> Save Session</button>
      <p>{`current session data is ${JSON.stringify(session)}`}</p>
    </div>
  );
}
