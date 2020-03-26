import Table from "@material-ui/core/Table";
import TableBody from "@material-ui/core/TableBody";
import TableCell from "@material-ui/core/TableCell";
import TableHead from "@material-ui/core/TableHead";
import TableRow from "@material-ui/core/TableRow";
import React from "react";
import { actionsHash, tryTokenizeResource } from "../lib/Actions";
import FunctionResourceCrumb from "./FunctionResourceCrumb";
import { Permission } from "../lib/FusebitTypes";

function PermissionReviewTable({ actions, resource, allow }: any) {
  const permissions = allow
    ? allow.map((a: Permission) => {
        const options = tryTokenizeResource(a.resource);
        const actionDetails = actionsHash[a.action];
        return {
          action: actionDetails ? (
            <React.Fragment>
              <strong>{actionDetails.action}</strong> -{" "}
              {actionDetails.description}
            </React.Fragment>
          ) : (
            <strong>{a.action}</strong>
          ),
          resource: options ? (
            <FunctionResourceCrumb options={options} />
          ) : (
            a.resource
          )
        };
      })
    : actions.map((a: string) => ({
        action: (
          <React.Fragment>
            <strong>{actionsHash[a].action}</strong> -{" "}
            {actionsHash[a].description}
          </React.Fragment>
        ),
        resource:
          a.indexOf("function:") === 0 ? (
            <FunctionResourceCrumb options={resource.parts} />
          ) : (
            <FunctionResourceCrumb options={{}} />
          )
      }));

  return (
    <Table>
      <TableHead>
        <TableRow>
          <TableCell>Action</TableCell>
          <TableCell>Resource</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {permissions.map((row: any, i: number) => (
          <TableRow key={i}>
            <TableCell>{row.action}</TableCell>
            <TableCell>{row.resource}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default PermissionReviewTable;
