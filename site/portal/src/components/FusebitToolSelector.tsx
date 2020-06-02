import MenuItem from '@material-ui/core/MenuItem';
import Select from '@material-ui/core/Select';
import React from 'react';
import { useProfile } from './ProfileProvider';
import { flowsHash, flows } from '../lib/Flows';

function FusebitToolSelector({ flow, onFlowChange, allowNoTool, isUser, ...rest }: any) {
  const { profile } = useProfile();
  const oauthDeviceFlowEnabled = !!(
    profile.oauth.deviceAuthorizationUrl &&
    profile.oauth.deviceClientId &&
    profile.oauth.tokenUrl
  );

  const handleFlowChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    onFlowChange && onFlowChange(event.target.value as string);
  };

  const formatAccess = (flow: string) => (flowsHash[flow] && flowsHash[flow].description) || 'N/A';

  return (
    <Select id="flowChoice" value={flow} onChange={handleFlowChange} fullWidth {...rest}>
      {allowNoTool && (
        <MenuItem key="none" value="none">
          {formatAccess('none')}
        </MenuItem>
      )}
      {flows.map(f =>
        (f.id === 'oauth-device' && !oauthDeviceFlowEnabled) || (!isUser && f.id !== 'pki') ? null : (
          <MenuItem key={f.id} value={f.id}>
            {formatAccess(f.id)}
          </MenuItem>
        )
      )}
    </Select>
  );
}

export default FusebitToolSelector;
