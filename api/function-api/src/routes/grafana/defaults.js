export const defaultDashboards = [
  {
    title: 'basic',
    uid: 'logging',
    timezone: '',
    editable: false,
    gnetId: null,
    graphTooltip: 0,
    refresh: '',
    schemaVersion: 30,
    style: 'dark',
    links: [],
    time: {
      from: 'now-6h',
      to: 'now',
    },
    timepicker: {
      refresh_intervals: ['1s', '5s', '10s', '30s', '1m', '5m', '15m', '30m', '1h', '2h', '1d'],
    },
    tags: [],
    annotations: {
      list: [
        {
          builtIn: 1,
          datasource: '-- Grafana --',
          enable: true,
          hide: true,
          iconColor: 'rgba(0, 211, 255, 1)',
          name: 'Annotations & Alerts',
          target: {
            limit: 100,
            matchAny: false,
            tags: [],
            type: 'dashboard',
          },
          type: 'dashboard',
        },
      ],
    },
    panels: [
      {
        datasource: 'Loki',
        description: '',
        gridPos: {
          h: 9,
          w: 24,
          x: 0,
          y: 0,
        },
        id: 2,
        options: {
          dedupStrategy: 'none',
          enableLogDetails: true,
          prettifyLogMessage: false,
          showCommonLabels: false,
          showLabels: false,
          showTime: true,
          sortOrder: 'Descending',
          wrapLogMessage: false,
        },
        targets: [
          {
            expr:
              '{fusebit_accountId="$accountId",fusebit_subscriptionId="$subscriptionId",fusebit_boundaryId="$boundaryId",fusebit_functionId="$functionId"} | json | line_format "{{.msg}}"',
            refId: 'A',
          },
        ],
        type: 'logs',
      },
    ],
    templating: {
      list: [
        {
          current: {
            selected: false,
            text: '',
            value: '',
          },
          description: null,
          error: null,
          hide: 0,
          label: 'Account ID',
          name: 'accountId',
          options: [
            {
              selected: true,
              text: '',
              value: '',
            },
          ],
          query: '',
          skipUrlSync: false,
          type: 'textbox',
        },
        {
          current: {
            selected: false,
            text: '',
            value: '',
          },
          description: null,
          error: null,
          hide: 0,
          label: 'Subscription ID',
          name: 'subscriptionId',
          options: [
            {
              selected: true,
              text: '',
              value: '',
            },
          ],
          query: '',
          skipUrlSync: false,
          type: 'textbox',
        },
        {
          current: {
            selected: false,
            text: '',
            value: '',
          },
          description: null,
          error: null,
          hide: 0,
          label: 'Boundary ID',
          name: 'boundaryId',
          options: [
            {
              selected: true,
              text: '',
              value: '',
            },
          ],
          query: '',
          skipUrlSync: false,
          type: 'textbox',
        },
        {
          current: {
            selected: false,
            text: '',
            value: '',
          },
          description: null,
          error: null,
          hide: 0,
          label: 'Function ID',
          name: 'functionId',
          options: [
            {
              selected: true,
              text: '',
              value: '',
            },
          ],
          query: '',
          skipUrlSync: false,
          type: 'textbox',
        },
      ],
    },
  },
];

export const defaultDatasources = [
  {
    uid: 'tempo',
    name: 'Tempo',
    type: 'tempo',
    url: 'http://localhost:3200',
    access: 'proxy',
    basicAuth: false,
    isDefault: false,
    apiVersion: 1,
    editable: false,
    jsonData: {
      httpHeaderName1: 'X-Scope-OrgID',
      tracesToLogs: {
        datasourceUid: 'loki',
        filterBySpanID: true,
        filterByTraceID: true,
        tags: ['accountId'],
      },
    },
    secureJsonData: {
      httpHeaderValue1: '{{accountId}}',
    },
  },
  {
    uid: 'loki',
    name: 'Loki',
    type: 'loki',
    url: 'http://localhost:3100',
    access: 'proxy',
    basicAuth: false,
    isDefault: true,
    apiVersion: 1,
    editable: false,
    jsonData: {
      derivedFields: [
        {
          datasourceUid: 'tempo',
          matcherRegex: 'traceID=(\\w+)',
          name: 'traceID',
          url: '${__value.raw}',
        },
      ],
      httpHeaderName1: 'X-Scope-OrgID',
    },
    secureJsonData: {
      httpHeaderValue1: '{{accountId}}',
    },
  },
];
