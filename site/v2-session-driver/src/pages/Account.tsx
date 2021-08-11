import React, { ReactElement } from 'react';
import { setAccount } from '../api/LocalStorage';

export function Account(): ReactElement {
  const [accountId, setAccountId] = React.useState('');
  const [subscriptionId, setSubscriptionId] = React.useState('');
  const handleAccountIdInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    setAccountId(event.target.value);
  };
  const handleSubscriptionIdInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSubscriptionId(event.target.value);
  };
  const handleSaveAccount = async (event: React.MouseEvent) => {
    setAccount({ accountId, subscriptionId });
    window.location.href = '/integrations';
  };
  return (
    <div>
      <div>AccountId:</div>
      <input onChange={handleAccountIdInput} />
      <div>SubcriptionId:</div>
      <input onChange={handleSubscriptionIdInput} />
      <button onClick={handleSaveAccount}>Save Account Details</button>
    </div>
  );
}
