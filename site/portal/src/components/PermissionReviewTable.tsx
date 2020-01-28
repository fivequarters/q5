import Table from "@material-ui/core/Table";
import TableBody from "@material-ui/core/TableBody";
import TableCell from "@material-ui/core/TableCell";
import TableHead from "@material-ui/core/TableHead";
import TableRow from "@material-ui/core/TableRow";
import React from "react";
import { actionsHash } from "../lib/Actions";
import FunctionResourceCrumb from "./FunctionResourceCrumb";

function PermissionReviewTable({ actions, resource, data }: any) {
  const permissions = actions.map((a: string) => ({
    action: (
      <React.Fragment>
        <strong>{actionsHash[a].action}</strong> - {actionsHash[a].description}
      </React.Fragment>
    ),
    resource:
      a.indexOf("function:") === 0 ? (
        <FunctionResourceCrumb data={data} options={resource.parts} />
      ) : (
        <FunctionResourceCrumb data={data} options={{}} />
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
