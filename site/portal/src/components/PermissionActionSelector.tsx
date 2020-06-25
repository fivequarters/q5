import MenuItem from '@material-ui/core/MenuItem';
import Select from '@material-ui/core/Select';
import React from 'react';
import { useProfile } from './ProfileProvider';
import { actions } from '../lib/Actions';

function PermissionActionSelector({ action, onChange, ...rest }: any) {
  const { profile } = useProfile();
  const allow = (profile.me && profile.me.access.allow) || [];

  const isActionInScope = (candidate: string, existing: string) => {
    if (existing === '*' || candidate === existing) return true;
    let tokens = existing.split(':');
    if (tokens[1] === '*' && candidate.indexOf(`${tokens[0]}:`) === 0) return true;
    return false;
  };

  const allowedActions = actions.reduce<any[]>((current, a) => {
    for (let i = 0; i < allow.length; i++) {
      if (isActionInScope(a.action, allow[i].action)) {
        current.push(a);
        return current;
      }
    }
    return current;
  }, []);

  if (!action && onChange && allowedActions.length > 0) {
    action = allowedActions[0].action;
    onChange(action, allowedActions[0].description);
  }

  const handleActionChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    if (onChange) {
      let description = '';
      let action = event.target.value as string;
      for (var i = 0; i < actions.length; i++) {
        if (actions[i].action === action) {
          description = actions[i].description;
          break;
        }
      }
      onChange(action, description);
    }
  };

  return (
    <Select id="actionChoice" value={action} onChange={handleActionChange} {...rest}>
      {allowedActions.map((a: any) => (
        <MenuItem key={a.action} value={a.action}>
          <strong>{a.action}</strong> - {a.description}
        </MenuItem>
      ))}
    </Select>
  );
}

export default PermissionActionSelector;
