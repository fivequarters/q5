import React, { useEffect, useRef } from 'react';
import { IFusebitProfile } from '../lib/Settings';
import MaterialTable from 'material-table';
import ReactJson from 'react-json-view';
import { IDateInterval, getBulkMonitorData, formatByBucketWidth, BucketWidths } from '../lib/FusebitMonitor';

import ResourceCrumb from './ResourceCrumb';

interface IProps {
  profile: IFusebitProfile;
  urlWart: string;
  interval: IDateInterval | null;
  activeCode: string | number | null;
}

interface ViewRow {
  timestamp: string;
  requestId: string;
  responseCode: number;
  method: string;
  url: string;
  hostname: string;
  subscriptionId: string;
  boundaryId: string;
  functionId: string;
  dataRow: any;
}

const toCol = (field: string, title: string, params: any = {}): any => ({
  field,
  title,
  ...params,
});

const resourceRender = (row: any) => (
  <ResourceCrumb
    resource={`/account/${row.dataRow.fusebit.accountId}/subscription/${row.dataRow.fusebit.subscriptionId}/boundary/${row.dataRow.fusebit.boundaryId}/function/${row.dataRow.fusebit.functionId}/`}
  />
);

const toEventViewRow = (dataRow: any): ViewRow => ({
  timestamp: dataRow.timestamp,
  requestId: dataRow.requestId,
  responseCode: dataRow.response.statusCode,
  method: dataRow.request.method,
  url: dataRow.request.url,
  hostname: dataRow.request.hostname,
  subscriptionId: dataRow.fusebit.subscriptionId,
  boundaryId: dataRow.fusebit.boundaryId,
  functionId: dataRow.fusebit.functionId,
  dataRow: dataRow,
});

const HTTPActivityLog: React.FC<IProps> = ({ profile, urlWart, interval, activeCode }) => {
  const tableRef = useRef<any>(null);

  useEffect(() => {
    tableRef.current && tableRef.current.onQueryChange();
  }, [profile, urlWart, interval, activeCode]);

  const eventColumns: any[] = [
    toCol('timestamp', 'Time', {
      width: 120,
      render: (r: any) => {
        let d = new Date(r.timestamp);
        let s: string;
        if (interval) {
          s = formatByBucketWidth(d, interval.width, false);
          if (interval.width === BucketWidths.Second) {
            s = s + '.' + `${d.getMilliseconds()}`.padStart(3, '0');
          }
        } else {
          s = formatByBucketWidth(d, BucketWidths.Minute, false);
        }
        return <div>{s}</div>;
      },
    }),
    toCol('responseCode', 'Code', { width: 50 }),
    toCol('hostname', 'Source'),
    toCol('method', 'Method', { width: 50 }),
    toCol('resource', 'Resource', { render: resourceRender }),
  ];

  return (
    <MaterialTable
      tableRef={tableRef}
      title="Events"
      columns={eventColumns}
      style={{ backgroundColor: 'transparent', boxShadow: 'none' }}
      data={(query: any): Promise<any> => {
        return new Promise((resolve, reject) => {
          getBulkMonitorData(
            profile,
            urlWart,
            interval,
            activeCode,
            {
              offset: query.page * query.pageSize,
              pageSize: query.pageSize,
              orderBy: query.orderBy ? query.orderBy.field : 'timestamp',
              orderDir: query.orderDirection !== '' ? query.orderDirection : 'desc',
            },
            (data: any) => {
              resolve({ data: data.items.map(toEventViewRow), page: query.page, totalCount: data.total });
            }
          );
        });
      }}
      detailPanel={(rowData: any) => {
        return <ReactJson name={null} src={rowData.dataRow} displayDataTypes={false} displayObjectSize={false} />;
      }}
      onRowClick={(event, rowData, togglePanel) => togglePanel && togglePanel()}
      options={{
        sorting: false, // Not yet implemented on the backend, along with filtering.
        search: false,
        filtering: false,
        headerStyle: {
          backgroundColor: 'transparent',
        },
      }}
    />
  );
};

export default HTTPActivityLog;
