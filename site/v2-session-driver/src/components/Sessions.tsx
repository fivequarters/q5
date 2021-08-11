import React from 'react';
import HourglassFullIcon from '@material-ui/icons/HourglassFull';
import { ILocalStorage } from '../api/LocalStorage';

// Render existing sessions
export default function Sessions(sessions?: ILocalStorage[]) {
  const sessionsComponent = sessions?.map((sessionItem: ILocalStorage) => {
    return <p key={sessionItem.sessionId}>{sessionItem.integrationBaseUrl}</p>;
  });

  return <>{sessionsComponent}</>;
}
