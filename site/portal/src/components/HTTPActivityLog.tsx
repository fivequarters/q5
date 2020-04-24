import React, { useEffect, useRef } from 'react';
import { IFusebitProfile } from '../lib/Settings';
import Superagent from 'superagent';
import { ensureAccessToken, createHttpException } from '../lib/Fusebit';
import MaterialTable from 'material-table';
import ReactJson from 'react-json-view';
import { IDateInterval } from './MonitorTypes';

interface IProps {
  profile: IFusebitProfile;
  urlWart: string;
  interval: IDateInterval | null;
  activeCode: number | null;
}

interface GetDataOptions {
  offset: number;
  pageSize: number;
  orderBy: string;
  orderDir: string;
}

const getData = async (
  profile: IFusebitProfile,
  urlWart: string,
  interval: IDateInterval | null,
  activeCode: number | null,
  options: GetDataOptions,
  setData: any
): Promise<void> => {
  if (interval == null || activeCode == null) {
    return setData({ items: [], total: 0 });
  }

  try {
    const auth = await ensureAccessToken(profile);

    let result: any = await Superagent.get(`${urlWart}/statistics/itemizedbulk`)
      .query({
        from: interval.from.toISOString(),
        to: interval.to.toISOString(),
        statusCode: activeCode,
        next: options.offset,
        count: options.pageSize,
      })
      .set('Authorization', `Bearer ${auth.access_token}`);

    setData(result.body);
  } catch (e) {
    throw createHttpException(e);
  }
};

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

const eventColumns: any[] = [
  toCol('timestamp', 'Time'),
  toCol('responseCode', 'Code'),
  toCol('method', 'Method'),
  toCol('url', 'URL'),
  toCol('hostname', 'Source'),
  toCol('subscriptionId', 'Subscription'),
  toCol('boundaryId', 'Boundary'),
  toCol('functionId', 'Function'),
];

const toEventViewRow = (dataRow: any): ViewRow => ({
  timestamp: dataRow.timestamp,
  requestId: dataRow.requestId,
  responseCode: dataRow.response.statusCode,
  method: dataRow.request.method,
  url: dataRow.request.url,
  hostname: dataRow.request.hostname,
  subscriptionId: dataRow.request.params.subscriptionId,
  boundaryId: dataRow.request.params.boundaryId,
  functionId: dataRow.request.params.functionId,
  dataRow: dataRow,
});

const HTTPActivityLog: React.FC<IProps> = ({ profile, urlWart, interval, activeCode }) => {
  const tableRef = useRef<any>(null);

  useEffect(() => {
    tableRef.current && tableRef.current.onQueryChange();
  }, [profile, urlWart, interval, activeCode]);

  return (
    <MaterialTable
      tableRef={tableRef}
      title="Events"
      columns={eventColumns}
      data={(query: any): Promise<any> => {
        return new Promise((resolve, reject) => {
          getData(
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
      }}
    />
  );
};

export default HTTPActivityLog;
