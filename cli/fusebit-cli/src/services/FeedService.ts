import superagent from 'superagent';
import Mustache from 'mustache';

import { randomBytes } from 'crypto';

import { Text } from '@5qtrs/text';
import { IExecuteInput } from '@5qtrs/cli';
import { IFusebitExecutionProfile } from '@5qtrs/fusebit-profile-sdk';
import { EntityType, IIntegration, IIntegrationData, IConnector, IConnectorData } from '@fusebit/schema';

import { ExecuteService } from './ExecuteService';
import { ProfileService } from './ProfileService';

import { FeedTypes } from '../commands/fuse/feed/FeedOptions';

const FEED_BASE_URL = process.env.FEED_BASE_URL || 'https://manage.fusebit.io/feed/';

interface IEntity<T extends EntityType> {
  entityType: T;
  id: string;
  isApplication?: boolean;
  data: T extends EntityType.connector ? IConnectorData : IIntegrationData;
  tags: {
    [key: string]: string;
  };
}

interface IFeed {
  id: string;
  feedSource: string;
  name: string;
  description: string;
  tags: {
    service: string;
    feed: string;
  };
  resources: {
    configureAppDocUrl: string;
  };
  configuration: {
    entities: Record<string, IEntity<EntityType.connector> | IEntity<EntityType.integration>>;
  };
}

interface IFeedArtifacts {
  connectors: IConnector[];
  integrations: IIntegration[];
}

const walkObjectStrings = (obj: any, func: (value: string) => string): any => {
  Object.entries(obj).forEach(([key, value]) => {
    if (typeof value === 'string') {
      obj[key] = func(value);
    } else if (typeof value === 'object') {
      walkObjectStrings(value, func);
    }
  });
  return obj;
};

export class FeedService {
  public feed: IFeed[] = [];

  public input: IExecuteInput;
  public executeService: ExecuteService;
  public profile: IFusebitExecutionProfile;

  constructor(input: IExecuteInput, executeService: ExecuteService, profile: IFusebitExecutionProfile) {
    this.input = input;
    this.executeService = executeService;
    this.profile = profile;
  }

  public static async create(input: IExecuteInput) {
    const executeService = await ExecuteService.create(input);
    const profileService = await ProfileService.create(input);
    const profile = await profileService.getExecutionProfile(['account', 'subscription']);

    return new FeedService(input, executeService, profile);
  }

  public async loadFeed(feedType: FeedTypes) {
    let feed: IFeed[] = [];

    if (feedType === FeedTypes.all || feedType === FeedTypes.integration) {
      const urlFeed: IFeed[] = await this.loadFeedByUrl(FEED_BASE_URL + `integrationsFeed.json`);
      feed = urlFeed.map((f: IFeed) => ({ ...f, feedSource: 'integration' }));
    }

    if (feedType === FeedTypes.all || feedType === FeedTypes.connector) {
      const urlFeed = await this.loadFeedByUrl(FEED_BASE_URL + `connectorsFeed.json`);
      feed = [...feed, ...urlFeed.map((f: IFeed) => ({ ...f, feedSource: 'connector' }))];
    }

    this.feed = feed;
    return feed;
  }

  public async loadFeedByUrl(url: string) {
    const response = await superagent.get(url);
    return response.body;
  }

  public async renderById(feedId: string): Promise<IFeedArtifacts> {
    const feed = this.feed.find((entry) => entry.id === feedId);
    if (feed) {
      return this.render(feed);
    }
    await this.executeService.error('Feed Error', `Unknown feed id ${feedId}`);
    throw new Error('never');
  }

  protected createGlobals(feed: IFeed) {
    const global: any = {
      entities: {},
      consts: {
        accountId: this.profile.account,
        subscriptionId: this.profile.subscription,
        endpoint: this.profile.baseUrl,
        integrationId: () => {
          const integration: any = Object.entries(feed.configuration.entities).find(
            ([, entity]) => entity.entityType === EntityType.integration
          );
          return integration ? global.entities[integration[0]]?.id() || integration[1].id : '';
        },
        random: () => {
          return randomBytes(32).toString('hex');
        },
        feed: { ...JSON.parse(JSON.stringify(feed)) },
      },
    };

    return global;
  }

  protected makeEntityId<T extends EntityType>(entity: IEntity<T>, feedId: string, commonRandom: number) {
    return `${feedId}-${entity.entityType}-${commonRandom}`;
  }

  protected getCommonTags(feed: IFeed) {
    return {
      'fusebit.feedId': feed.id,
      'fusebit.feedType': feed.feedSource,
    };
  }

  protected async render(feed: IFeed): Promise<IFeedArtifacts> {
    // Disable html escaping because these values are all trusted
    Mustache.escape = (s: string) => s;
    const customTags: any = ['<%', '%>'];

    const global = this.createGlobals(feed);

    if (!feed.configuration?.entities) {
      throw new Error(`Not a deployable feed (${feed.id})`);
    }

    const entityIdCache: Record<string, { id?: string }> = {};

    const commonRandom = Math.floor(Math.random() * 1000);

    const entityCount: Record<string, number> = {
      connector: 0,
      integration: 0,
    };

    Object.entries(feed.configuration.entities).forEach(([name, entity]) => {
      if (!entityIdCache[name]) {
        entityIdCache[name] = {};
      }

      // Use global.entities to allow inter-entity references (for acquiring id's, for example).
      global.entities[name] = {
        id: () => {
          // Only create a new random ID once for an entry
          if (!entityIdCache[name].id) {
            entityIdCache[name].id = this.makeEntityId(entity, feed.id, commonRandom);

            entityCount[entity.entityType] += 1;
            if (entityCount[entity.entityType] > 1) {
              entityIdCache[name].id += `-${entityCount[entity.entityType]}`;
            }
          }
          return entityIdCache[name].id;
        },
      };
    });

    // Now parse each entity, replacing its strings as appropriate
    Object.entries(feed.configuration.entities).forEach(([name, entity]) => {
      const view = {
        // Enable 'this' to always be used to get the current entities id and name.
        this: {
          id: () => global.entities[name].id(),
          name,
        },

        // Otherwise, expose the global datapoints and utility methods.
        global,
      };

      // Walk the entire object, running the mustache across any strings found
      feed.configuration.entities[name] = walkObjectStrings(entity, (value: string) =>
        Mustache.render(value, view, {}, customTags)
      );
    });

    // Convert into something that can be published or serialized to disk.
    const result: IFeedArtifacts = {
      integrations: [],
      connectors: [],
    };

    const commonTags = this.getCommonTags(feed);

    Object.values(feed.configuration.entities).forEach((entity) => {
      if (entity.entityType === EntityType.integration) {
        const element: IIntegration = {
          accountId: this.profile!.account,
          subscriptionId: this.profile.subscription || '',
          ...entity,
          data: entity.data as IIntegrationData,
          tags: commonTags,
        };
        result.integrations.push(element);
      }
      if (entity.entityType === EntityType.connector) {
        const element: IConnector = {
          accountId: this.profile!.account,
          subscriptionId: this.profile!.subscription || '',
          ...entity,
          data: entity.data as IConnectorData,
          tags: commonTags,
        };
        result.connectors.push(element);
      }
    });

    return result;
  }

  public async displayFeed() {
    const visibleEntries = this.feed.filter((entry) => entry.configuration.entities);

    if (this.input.options.output === 'json') {
      // Output a json dump of the available options
      this.input.io.writeLineRaw(JSON.stringify(visibleEntries, null, 2));
      return;
    }

    // Output a pretty table of results
    await this.executeService.result(Text.cyan('Name'), Text.cyan('Description'));
    for (const entry of visibleEntries) {
      await this.executeService.result(
        Text.bold(entry.name),
        Text.create(['Key: ', Text.bold(entry.id), Text.eol(), entry.description.split('\n')[0]])
      );
    }
  }
}
