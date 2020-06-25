import React from 'react';
import ActionFab from './ActionFab';
import AddPermissionSetDialog from './AddPermissionSetDialog';
import SetupAccessDialog from './SetupAccessDialog';
import { useAgent, reloadAgent } from './AgentProvider';

function ClientActionFab() {
  const [setupAccessOpen, setSetupAccessOpen] = React.useState(false);
  const [addPermissionSetOpen, setAddPermissionSetOpen] = React.useState(false);
  const [agent, setAgent] = useAgent();

  const handleAddPermissionSetClose = () => {
    setAddPermissionSetOpen(false);
    if (agent.status === 'error') {
      reloadAgent(agent, setAgent);
    }
  };

  return (
    <React.Fragment>
      <ActionFab
        title="Quick Actions"
        subtitle="Easily manage this client with these common actions:"
        actions={[
          {
            name: 'Grant permission set',
            handler: () => setAddPermissionSetOpen(true),
          },
          {
            name: 'Connect CLI client to Fusebit',
            handler: () => setSetupAccessOpen(true),
          },
          // {
          //   name: "Connect API client to Fusebit",
          //   handler: () => setSetupAccessOpen(true)
          // }
        ]}
      />
      {setupAccessOpen && <SetupAccessDialog onClose={() => setSetupAccessOpen(false)} />}
      {addPermissionSetOpen && <AddPermissionSetDialog onClose={handleAddPermissionSetClose} />}
    </React.Fragment>
  );
}

export default ClientActionFab;
