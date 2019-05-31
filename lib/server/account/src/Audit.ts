import { cancelOnError } from '@5qtrs/promise';
import { IAccountDataContext, IListAuditEntriesResult, AccountDataException } from '@5qtrs/account-data';
import { AccountConfig } from './AccountConfig';
import { ResolvedAgent } from './ResolvedAgent';

// ------------------
// Internal Constants
// ------------------

const second = 1000;
const minute = 60 * second;
const hour = 60 * minute;
const day = 24 * hour;
const defaultFromFilter = '-15m';
const intervalLookup: { [index: string]: number } = { s: second, m: minute, h: hour, d: day };
const relativeTimeRegex = /^\-(\d+)([mshd])$/;

// ------------------
// Internal Functions
// ------------------

function getRelativeTime(value: number, interval: string): Date {
  return new Date(new Date().getTime() - value * intervalLookup[interval]);
}

function isValidDate(date: Date) {
  return date.toString() !== 'Invalid Date';
}

function parseFilterTime(type: string, value: string): Date {
  try {
    let match = value.match(relativeTimeRegex);
    if (match) {
      return getRelativeTime(parseInt(match[1], 10), match[2]);
    } else {
      const parsedDateString = new Date(value);
      if (isValidDate(parsedDateString)) {
        return parsedDateString;
      }

      const timestamp = parseInt(value);
      if (!isNaN(timestamp)) {
        const asParsedTimestamp = new Date(timestamp);
        if (isValidDate(asParsedTimestamp)) {
          return asParsedTimestamp;
        }
      }
    }
  } catch (error) {
    // do nothing
  }
  throw AccountDataException.invalidFilterDate(type, value);
}

function normalizeOptions(options?: IListAuditEntriesOptions) {
  if (!options) {
    return undefined;
  }

  if (options.subject && !options.issuerId) {
    throw AccountDataException.invalidFilterIdentity(options.subject);
  }

  const to = options.to ? parseFilterTime('to', options.to) : undefined;
  const from = parseFilterTime('from', options.from || defaultFromFilter);

  if (from && to && from > to) {
    throw AccountDataException.invalidFilterDateOrder(from, to);
  }

  const normalizeOptions = {
    to,
    from,
    next: options.next,
    limit: options.limit,
    issuerId: options.issuerId,
    subject: options.subject,
    actionContains: options.actionContains,
    resourceStartsWith: options.resourceStartsWith,
  };

  return normalizeOptions;
}

// -------------------
// Exported Interfaces
// -------------------

export interface IListAuditEntriesOptions {
  next?: string;
  limit?: number;
  from?: string;
  to?: string;
  resourceStartsWith?: string;
  actionContains?: string;
  issuerId?: string;
  subject?: string;
}

// ----------------
// Exported Classes
// ----------------

export class Audit {
  private config: AccountConfig;
  private dataContext: IAccountDataContext;

  private constructor(config: AccountConfig, dataContext: IAccountDataContext) {
    this.config = config;
    this.dataContext = dataContext;
  }

  public static async create(config: AccountConfig, dataContext: IAccountDataContext) {
    return new Audit(config, dataContext);
  }

  public async list(
    resolvedAgent: ResolvedAgent,
    accountId: string,
    options?: IListAuditEntriesOptions
  ): Promise<IListAuditEntriesResult> {
    const accountPromise = this.dataContext.accountData.get(accountId);
    const normalizedOptions = normalizeOptions(options);
    const auditPromise = this.dataContext.auditData.list(accountId, normalizedOptions);
    return cancelOnError(accountPromise, auditPromise);
  }
}
