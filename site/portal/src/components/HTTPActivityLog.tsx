import React, { useState, useEffect } from 'react';
import LinearProgress from '@material-ui/core/LinearProgress';
import { IFusebitProfile } from '../lib/Settings';
import Superagent from 'superagent';
import { ensureAccessToken, createHttpException } from '../lib/Fusebit';
import ExplorerTable, { HeadCell } from './ExplorerTable';

enum BucketWidths {
  Minute = '1m',
  Hour = '1h',
  Day = '1d',
  Week = '1w',
  Month = '1M',
  Quarter = '1q',
  Year = '1y',
}

interface IDateInterval {
  width: BucketWidths;
  timeStart: Date;
  timeEnd: Date;
}

interface IProps {
  profile: IFusebitProfile;
  urlWart: string;
  interval: IDateInterval | null;
  activeCode: number | null;
}

const getData = async (
  profile: IFusebitProfile,
  urlWart: string,
  interval: IDateInterval,
  activeCode: number,
  setData: any
): Promise<void> => {
  try {
    const auth = await ensureAccessToken(profile);

    let result: any = await Superagent.get(
      `${urlWart}/statistics/itemizedbulk/` +
        `${interval.timeStart.toISOString()}/${interval.timeEnd.toISOString()}/${activeCode}`
    ).set('Authorization', `Bearer ${auth.access_token}`);

    // Make sure there's always a 0-value begin and end entry to track 'loading' state easily.
    if (result.body.data.length === 0) {
      result.body.data = [{ key: interval.timeStart }, { key: interval.timeEnd }];
    }

    console.log(result.body);

    setData(result.body);
  } catch (e) {
    throw createHttpException(e);
  }
};

//{
//    "timestamp": "2020-04-16T23:04:07.351Z",
//    "requestId": "99d77a18-4ca4-4cb3-a976-abd17d871006",
//    "request": {
//        "headers": {
//            "host": "localhost:3001",
//            "user-agent": "curl/7.58.0",
//            "accept": "*/*"
//        },
//        "httpVersionMajor": 1,
//        "httpVersionMinor": 1,
//        "method": "GET",
//        "url": "/run/sub-8dc425cdd9874723/dev-john/bar",
//        "hostname": "localhost",
//        "ip": "::ffff:127.0.0.1",
//        "ips": [],
//        "params": {
//            "subscriptionId": "sub-8dc425cdd9874723",
//            "boundaryId": "dev-john",
//            "functionId": "bar"
//        },
//        "path": "/run/sub-8dc425cdd9874723/dev-john/bar",
//        "protocol": "http",
//        "query": {},
//        "xhr": false
//    },
//    "response": {
//        "statusCode": 200
//    },
//    "error": null,
//    "metrics": {
//        "lambda": {
//            "duration": "1.03",
//            "memory": "73"
//        },
//        "common": {
//            "duration": 127
//        }
//    }
//}

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
}

const renderHead = (id: string, label: string, params: any = {}): HeadCell<ViewRow> => ({
  id,
  label,
  ...params,
});

const headCells: HeadCell<ViewRow>[] = [
  renderHead('timestamp', 'Time'),
  renderHead('responseCode', 'Code'),
  renderHead('method', 'Method'),
  renderHead('url', 'URL'),
  renderHead('hostname', 'Source'),
  renderHead('subscriptionId', 'Subscription'),
  renderHead('boundaryId', 'Boundary'),
  renderHead('functionId', 'Function'),
];

const createViewRow = (dataRow: any): ViewRow => ({
  timestamp: dataRow.timestamp,
  requestId: dataRow.requestId,
  responseCode: dataRow.response.statusCode,
  method: dataRow.request.method,
  url: dataRow.request.url,
  hostname: dataRow.request.hostname,
  subscriptionId: dataRow.request.params.subscriptionId,
  boundaryId: dataRow.request.params.boundaryId,
  functionId: dataRow.request.params.functionId,
});

const HTTPActivityLog: React.FC<IProps> = ({ profile, urlWart, interval, activeCode }) => {
  const [eventData, setEventData] = useState({ data: [] });

  useEffect(() => {
    if (activeCode && interval) {
      console.log('Loading activities', activeCode, interval);
      getData(profile, urlWart, interval, activeCode, setEventData);
    }
  }, [profile, urlWart, interval, activeCode, setEventData]);

  // Not yet enabled.
  if (!activeCode || !interval) {
    return (
      <ExplorerTable<ViewRow>
        rows={[]}
        headCells={headCells}
        defaultSortKey="timestamp"
        identityKey="requestId"
        title="Events"
      />
    );
  }

  // Still loading data
  if (eventData.data.length === 0) {
    return <LinearProgress />;
  }

  const viewData = eventData.data.map(createViewRow);

  console.log(viewData);

  return (
    <ExplorerTable<ViewRow>
      rows={viewData}
      headCells={headCells}
      defaultSortKey="timestamp"
      identityKey="requestId"
      title="Events"
    />
  );
};

export default HTTPActivityLog;
