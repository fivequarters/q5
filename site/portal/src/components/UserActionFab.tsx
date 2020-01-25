import React from "react";
import ActionFab from "./ActionFab";
import AddPermissionSetDialog from "./AddPermissionSetDialog";
import SetupAccessDialog from "./SetupAccessDialog";
import { useAgent, reloadAgent } from "./AgentProvider";

function UserActionFab() {
  const [setupAccessOpen, setSetupAccessOpen] = React.useState(false);
  const [addPermissionSetOpen, setAddPermissionSetOpen] = React.useState(false);
  const [data, setData] = React.useState<any>({});
  const [agent, setAgent] = useAgent();

  const handleAddPermissionSetClose = () => {
    setAddPermissionSetOpen(false);
    if (agent.status === "error") {
      reloadAgent(agent, setAgent);
    }
  };

  return (
    <React.Fragment>
      <ActionFab
        title="Quick Actions"
        subtitle="Easily manage this user with these common actions:"
        actions={[
          {
            name: "Grant permission set",
            handler: () => setAddPermissionSetOpen(true)
          },
          {
            name: "Invite user to the platform",
            handler: () => setSetupAccessOpen(true)
          }
        ]}
      />
      {setupAccessOpen && (
        <SetupAccessDialog
          data={data}
          onNewData={(newData: any) => setData(newData)}
          onClose={() => setSetupAccessOpen(false)}
        />
      )}
      {addPermissionSetOpen && (
        <AddPermissionSetDialog
          data={data}
          onNewData={(newData: any) => setData(newData)}
          onClose={handleAddPermissionSetClose}
        />
      )}
    </React.Fragment>
  );
}

export default UserActionFab;
