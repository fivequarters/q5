import React, { ReactElement } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@material-ui/core';

export function Home(): ReactElement {
  return (
    <div>
      <Link to={'/account'}>
        <Button>Account</Button>
      </Link>
      <br />
      <Link to={'/users'}>
        <Button>Users</Button>
      </Link>
    </div>
  );
}
