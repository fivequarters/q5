import { IFusebitProfile } from './Settings';
import { ensureAccessToken, createHttpException } from './Fusebit';
import Superagent from 'superagent';

enum BucketWidths {
  Second = '1s',
  Minute = '1m',
  Hour = '1h',
  Day = '1d',
  Week = '1w',
  Month = '1M',
  Quarter = '1q',
  Year = '1y',
}

interface IDateIntervalType {
  width: BucketWidths;
  from: Date;
  to: Date;
}

interface IGetDataOptionsType {
  offset: number;
  pageSize: number;
  orderBy: string;
  orderDir: string;
}

const Locale = 'en-US';

const TZLocal = Intl.DateTimeFormat().resolvedOptions().timeZone;
const TZUTC = 'utc';

const BucketWidthsDateFormat = {
  [BucketWidths.Second]: { minute: 'numeric', second: 'numeric' },
  [BucketWidths.Minute]: { hour: 'numeric', minute: 'numeric', second: 'numeric' },
  [BucketWidths.Hour]: { month: 'short', day: 'numeric', hour: 'numeric' },
  [BucketWidths.Day]: { month: 'short', day: 'numeric' },
  [BucketWidths.Week]: { month: 'short', day: 'numeric' },
  [BucketWidths.Month]: { year: '2-digit', month: 'short', day: 'numeric' },
  [BucketWidths.Quarter]: { year: '2-digit', month: 'short' },
  [BucketWidths.Year]: { year: '2-digit', month: 'short' },
};

const formatByBucketWidth = (
  date: Date,
  bucket: BucketWidths,
  utc: boolean = true,
  locale: string = Locale
): string => {
  return new Intl.DateTimeFormat(locale, { ...BucketWidthsDateFormat[bucket], timeZone: utc ? TZUTC : TZLocal }).format(
    date
  );
};

const getBulkMonitorData = async (
  profile: IFusebitProfile,
  urlWart: string,
  interval: IDateInterval | null,
  activeCode: string | number | null,
  options: IGetDataOptions,
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

const getStatisticalMonitorData = async (
  profile: IFusebitProfile,
  queryType: string,
  urlWart: string,
  codeGrouped: boolean,
  interval: IDateInterval,
  setData: any,
  setActiveCodeList: any
): Promise<void> => {
  try {
    const auth = await ensureAccessToken(profile);

    let result: any = await Superagent.get(`${urlWart}/statistics/${queryType}`)
      .query({
        from: interval.from.toISOString(),
        to: interval.to.toISOString(),
        width: interval.width,
        codeGrouped: codeGrouped ? null : undefined,
      })
      .set('Authorization', `Bearer ${auth.access_token}`);

    // Make sure there's always a 0-value begin and end entry to track 'loading' state easily.
    if (result.body.items.length === 0) {
      result.body.items = [{ key: interval.from }, { key: interval.to }];
    }

    // Convert the ISO8601 strings into ms time, which the graphing libraries deal with better.
    setData({
      codes: result.body.codes,
      items: result.body.items.map((e: any) => {
        return { ...e, key: Date.parse(e.key) };
      }),
    });
    setActiveCodeList(result.body.codes);
  } catch (e) {
    throw createHttpException(e);
  }
};

export type IDateInterval = IDateIntervalType;
export type IGetDataOptions = IGetDataOptionsType;

export { BucketWidths, formatByBucketWidth, getBulkMonitorData, getStatisticalMonitorData };
