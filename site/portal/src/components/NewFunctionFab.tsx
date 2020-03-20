import Fab from "@material-ui/core/Fab";
import AddIcon from "@material-ui/icons/Add";
import React from "react";
import { useHistory, useParams } from "react-router-dom";
import { useProfile } from "./ProfileProvider";

function NewFunctionFab() {
  const history = useHistory();
  const params: any = useParams();
  const { profile } = useProfile();

  const handleNewFunction = () => {
    const url = [
      `/accounts/${profile.account}/subscriptions/${params.subscriptionId}`
    ];
    if (params.boundaryId) {
      url.push(`/boundaries/${params.boundaryId}`);
    }
    url.push("/new-function");
    history.push(url.join(""));
  };

  return (
    <Fab color="secondary" onClick={handleNewFunction}>
      <AddIcon />
    </Fab>
  );
}

export default NewFunctionFab;
