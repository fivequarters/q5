import MenuItem from '@material-ui/core/MenuItem';
import CircularProgress from '@material-ui/core/CircularProgress';
import React from 'react';
import { useSubscriptions } from './SubscriptionsProvider';
import { TextField } from '@material-ui/core';

function SubscriptionSelector({ subscriptionId, onChange, enableAnySubscription, disabled, ...rest }: any) {
  const [subscriptions] = useSubscriptions();

  if (!subscriptionId) {
    if (enableAnySubscription) {
      subscriptionId = '*';
    } else if (subscriptions.status === 'ready' && subscriptions.existing.list.length > 0) {
      subscriptionId = subscriptions.existing.list[0].id;
    }
    subscriptionId && onChange && onChange(subscriptionId);
  }

  const handleChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    onChange && onChange(event.target.value as string);
  };

  function SubscriptionsLoading() {
    return <CircularProgress size={20} style={{ marginRight: 20 }} />;
  }

  if (subscriptions.status === 'error') {
    throw subscriptions.error;
  }

  return (
    <TextField
      id="subscriptionIdChoice"
      select
      label="Subscription"
      value={subscriptionId || ''}
      onChange={handleChange}
      disabled={subscriptions.status === 'loading'}
      IconComponent={subscriptions.status === 'loading' ? SubscriptionsLoading : undefined}
      {...rest}
    >
      {enableAnySubscription && (
        <MenuItem key="*" value="*">
          All subscriptions
        </MenuItem>
      )}
      {((subscriptions.status === 'ready' && subscriptions.existing.list) || []).map(s => (
        <MenuItem key={s.id} value={s.id}>
          {s.displayName || 'N/A'} ({s.id})
        </MenuItem>
      ))}
    </TextField>
  );
}

export default SubscriptionSelector;
