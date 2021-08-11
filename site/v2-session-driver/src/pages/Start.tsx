import React, { ReactElement } from 'react';
// import { RedisClient } from '../../redis';
import Sessions from '../components/Sessions';
import CreateSessionForm from '../components/CreateSessionForm';
import { ILocalStorage, listSessions } from '../api/LocalStorage';

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
  const sessions = listSessions() as ILocalStorage[];
  return (
    <div>
      <CreateSessionForm />
      {sessions && <p>There are not sessions</p>}
      {sessions && <h3>Sessions</h3>}
    </div>
  );
}
