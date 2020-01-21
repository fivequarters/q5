import Select from "@material-ui/core/Select";
import MenuItem from "@material-ui/core/MenuItem";
import FormControl from "@material-ui/core/FormControl";
import InputLabel from "@material-ui/core/InputLabel";
import CircularProgress from "@material-ui/core/CircularProgress";
import React from "react";
import { useProfile } from "./ProfileProvider";
import loadSubscriptions from "../effects/LoadSubscriptions";

function SubscriptionSelector({
  subscriptionId,
  onChange,
  data,
  onNewData,
  enableAnySubscription,
  ...rest
}: any) {
  const { profile } = useProfile();
  const loading = !!!(data && data.subscriptions);

  React.useEffect(loadSubscriptions(profile, data, onNewData), [
    data,
    onNewData,
    profile
  ]);

  if (
    !subscriptionId &&
    (enableAnySubscription ||
      (data &&
        data.subscriptions &&
        data.subscriptions.data &&
        data.subscriptions.data.length > 0))
  ) {
    subscriptionId = enableAnySubscription
      ? "*"
      : data.subscriptions.data[0].id;
    onChange && onChange(subscriptionId);
  }

  const handleChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    onChange && onChange(event.target.value as string);
  };

  function SubscriptionsLoading() {
    return <CircularProgress size={20} style={{ marginRight: 20 }} />;
  }

  if (data && data.subscriptions && data.subscriptions.error) {
    throw data.subscriptions.error;
  }

  return (
    <FormControl disabled={loading} {...rest}>
      <InputLabel htmlFor="subscriptionIdChoice">Subscription</InputLabel>
      <Select
        id="subscriptionIdChoice"
        value={
          (data &&
            data.subscriptions &&
            data.subscriptions.data &&
            data.subscriptions.data.length > 0 &&
            subscriptionId) ||
          ""
        }
        onChange={handleChange}
        IconComponent={loading ? SubscriptionsLoading : undefined}
        // {...rest}
      >
        {enableAnySubscription && (
          <MenuItem key="*" value="*">
            All subscriptions
          </MenuItem>
        )}
        {((data && data.subscriptions && data.subscriptions.data) || []).map(
          (s: any) => (
            <MenuItem key={s.id} value={s.id}>
              {s.displayName || "N/A"} ({s.id})
            </MenuItem>
          )
        )}
      </Select>
    </FormControl>
  );
}

export default SubscriptionSelector;
