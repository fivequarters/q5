enum BucketWidths {
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

const Locale = 'en-US';

const BucketWidthsDateFormat = {
  [BucketWidths.Minute]: new Intl.DateTimeFormat(Locale, { hour: 'numeric', minute: 'numeric', second: 'numeric' }),
  [BucketWidths.Hour]: new Intl.DateTimeFormat(Locale, { month: 'short', day: 'numeric', hour: 'numeric' }),
  [BucketWidths.Day]: new Intl.DateTimeFormat(Locale, { month: 'short', day: 'numeric' }),
  [BucketWidths.Week]: new Intl.DateTimeFormat(Locale, { month: 'short', day: 'numeric' }),
  [BucketWidths.Month]: new Intl.DateTimeFormat(Locale, { year: '2-digit', month: 'short', day: 'numeric' }),
  [BucketWidths.Quarter]: new Intl.DateTimeFormat(Locale, { year: '2-digit', month: 'short' }),
  [BucketWidths.Year]: new Intl.DateTimeFormat(Locale, { year: '2-digit', month: 'short' }),
};

export { BucketWidths, BucketWidthsDateFormat };
export type IDateInterval = IDateIntervalType;
