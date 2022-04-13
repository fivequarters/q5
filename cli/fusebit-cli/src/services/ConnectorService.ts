import { Text } from '@5qtrs/text';
import { IExecuteInput } from '@5qtrs/cli';
import { ProfileService } from './ProfileService';
import { ExecuteService } from './ExecuteService';

import { IBaseComponentType, BaseComponentService } from './BaseComponentService';

import { IConnectorData, EntityType } from '@fusebit/schema';

export interface IConnector extends IBaseComponentType {
  data: IConnectorData;
}

interface INoun {
  s: string;
  p: string;
}

export class ConnectorService extends BaseComponentService<IConnector> {
  protected noun: INoun;
  private constructor(
    profileService: ProfileService,
    executeService: ExecuteService,
    input: IExecuteInput,
    noun: INoun
  ) {
    super(EntityType.connector, profileService, executeService, input, noun.s);
    this.entityType = EntityType.connector;
    this.noun = noun;
  }

  public static async create(input: IExecuteInput, noun: INoun = { s: 'Connector', p: 'Connectors' }) {
    const executeService = await ExecuteService.create(input);
    const profileService = await ProfileService.create(input);
    return new ConnectorService(profileService, executeService, input, noun);
  }

  public createEmptySpec(): IConnector {
    return {
      id: 'unknown id',
      data: { handler: '', configuration: {}, files: {}, encodedFiles: {} },
      tags: {},
    };
  }

  public async displayEntities(
    items: IConnector[],
    firstDisplay: boolean,
    filterCfg?: (key: string) => number,
    fullDisplay: boolean = false
  ) {
    const profile = await this.profileService.getExecutionProfile(['account', 'subscription']);
    if (!items.length) {
      await this.executeService.info(
        `No ${this.noun.p}`,
        `No ${firstDisplay ? '' : 'more '}${this.noun.p.toLowerCase()} to list`
      );
      return;
    }

    for (const item of items) {
      const tagSummary: (string | Text)[] = ['Tags:'];
      if (item.tags) {
        Object.entries(item.tags).forEach(([tagKey, tagValue]: [string, string | null]) => {
          tagSummary.push(Text.eol(), Text.dim('• '), tagKey, Text.dim(': '), tagValue || ' ');
        });
      }

      const configSummary: (string | Text)[] = [Text.eol(), Text.eol(), 'Configuration:'];
      if (item.data.configuration && filterCfg) {
        Object.entries(item.data.configuration).forEach(([key, value]: [string, any]) => {
          const opt = filterCfg(key);
          if (opt > 0) {
            configSummary.push(Text.eol(), Text.dim('• '), key, Text.dim(': '), value || ' ');
          } else if (opt === 0) {
            configSummary.push(Text.eol(), Text.dim('• '), key, Text.dim(': '), '***');
          }
        });
      }

      await this.executeService.message(
        Text.bold(item.id),
        Text.create([
          ...(fullDisplay ? [`Handler: `, Text.bold(item.data.handler || ''), Text.eol(), Text.eol()] : []),
          ...tagSummary,
          ...configSummary,
          Text.eol(),
          Text.eol(),
          'Version',
          Text.dim(': '),
          item.version || 'unknown',
        ])
      );

      await this.executeService.message('', Text.create(['OAuth2 Redirect URL', Text.dim(': ')]));
      await this.input.io.writeLineRaw(`${this.getUrl(profile, item.id)}/api/callback`);
      await this.input.io.writeLine();
    }
  }

  public async makeEntitiesJson(items: IConnector[]) {
    return items.map((item) => this.sanitizeConnector(item, this.filterCfg));
  }

  public filterCfg(key: string) {
    // Show value
    if (['clientId', 'scope'].includes(key)) {
      return 1;
    }
    // Remove
    if (
      [
        'mode',
        'refreshErrorLimit',
        'refreshInitialBackoff',
        'refreshWaitCountLimit',
        'refreshBackoffIncrement',
        'accessTokenExpirationBuffer',
      ].includes(key)
    ) {
      return -1;
    }
    // Show, but hide value.
    return 0;
  }

  public sanitizeConnector(item: IConnector, filterCfg: (key: string) => number) {
    return {
      tags: item.tags,
      id: item.id,
      configuration: !item.data.configuration
        ? undefined
        : Object.entries(item.data.configuration).reduce(
            (p: Record<string, string>, [key, value]: [string, any]): Record<string, string> => {
              const opt = filterCfg(key);
              if (opt > 0) {
                p[key] = value;
              } else if (opt === 0) {
                p[key] = '***';
              }
              return p;
            },
            {}
          ),
    };
  }
}
