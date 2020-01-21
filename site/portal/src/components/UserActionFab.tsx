import React from "react";
import ActionFab from "./ActionFab";
import SetupAccessDialog from "./SetupAccessDialog";

function UserActionFab({ match }: any) {
  const { params } = match;
  const { userId } = params;
  const [setupAccessOpen, setSetupAccessOpen] = React.useState(false);
  const [data, setData] = React.useState<any>({});

  return (
    <React.Fragment>
      <ActionFab
        title="Quick Actions"
        subtitle="Easily manage this user with these common actions:"
        actions={[
          { name: "Grant permission sets" },
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
          agentId={userId}
          isUser
          onClose={() => setSetupAccessOpen(false)}
        />
      )}
    </React.Fragment>
  );
}

export default UserActionFab;
