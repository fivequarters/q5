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
  {
    "annotations": {
      "list": [
        {
          "builtIn": 1,
          "datasource": "-- Grafana --",
          "enable": true,
          "hide": true,
          "iconColor": "rgba(0, 211, 255, 1)",
          "name": "Annotations & Alerts",
          "target": {
            "limit": 100,
            "matchAny": false,
            "tags": [],
            "type": "dashboard"
          },
          "type": "dashboard"
        }
      ]
    },
    "description": "",
    "editable": false,
    "fiscalYearStartMonth": 0,
    "graphTooltip": 2,
    "iteration": 1659985582514,
    "links": [],
    "liveNow": true,
    "panels": [
      {
        "description": "",
        "fieldConfig": {
          "defaults": {
            "color": {
              "mode": "palette-classic"
            },
            "custom": {
              "axisLabel": "",
              "axisPlacement": "auto",
              "barAlignment": 0,
              "drawStyle": "bars",
              "fillOpacity": 100,
              "gradientMode": "none",
              "hideFrom": {
                "legend": false,
                "tooltip": false,
                "viz": false
              },
              "lineInterpolation": "linear",
              "lineStyle": {
                "fill": "solid"
              },
              "lineWidth": 2,
              "pointSize": 1,
              "scaleDistribution": {
                "type": "linear"
              },
              "showPoints": "auto",
              "spanNulls": false,
              "stacking": {
                "group": "A",
                "mode": "none"
              },
              "thresholdsStyle": {
                "mode": "off"
              }
            },
            "mappings": [],
            "thresholds": {
              "mode": "absolute",
              "steps": [
                {
                  "color": "green",
                  "value": null
                }
              ]
            },
            "unit": "req"
          },
          "overrides": [
            {
              "matcher": {
                "id": "byName",
                "options": "4xx"
              },
              "properties": [
                {
                  "id": "color",
                  "value": {
                    "fixedColor": "orange",
                    "mode": "fixed"
                  }
                }
              ]
            },
            {
              "matcher": {
                "id": "byName",
                "options": "5xx"
              },
              "properties": [
                {
                  "id": "color",
                  "value": {
                    "fixedColor": "red",
                    "mode": "fixed"
                  }
                }
              ]
            },
            {
              "matcher": {
                "id": "byName",
                "options": "2xx"
              },
              "properties": [
                {
                  "id": "color",
                  "value": {
                    "fixedColor": "green",
                    "mode": "fixed"
                  }
                }
              ]
            },
            {
              "matcher": {
                "id": "byName",
                "options": "3xx"
              },
              "properties": [
                {
                  "id": "color",
                  "value": {
                    "fixedColor": "blue",
                    "mode": "fixed"
                  }
                }
              ]
            }
          ]
        },
        "gridPos": {
          "h": 7,
          "w": 12,
          "x": 0,
          "y": 0
        },
        "hideTimeOverride": false,
        "id": 7,
        "interval": "1000ms",
        "maxDataPoints": 100000000000000000,
        "options": {
          "legend": {
            "calcs": [],
            "displayMode": "list",
            "placement": "bottom"
          },
          "tooltip": {
            "mode": "single"
          }
        },
        "pluginVersion": "8.4.0-pre",
        "targets": [
          {
            "datasource": {
              "type": "loki",
              "uid": "loki"
            },
            "expr": "count_over_time({fusebit_accountId=\"$accountId\",fusebit_subscriptionId=\"$subscriptionId\",fusebit_boundaryId=\"$boundaryId\",fusebit_functionId=\"$functionId\"} |~ \"2\\\\d{2}\\\\s[A-Z]{3,7}\\\\s\"[1s])",
            "hide": false,
            "instant": false,
            "legendFormat": "2xx",
            "range": true,
            "refId": "2xx",
            "resolution": 1
          },
          {
            "datasource": {
              "type": "loki",
              "uid": "loki"
            },
            "expr": "count_over_time({fusebit_accountId=\"$accountId\",fusebit_subscriptionId=\"$subscriptionId\",fusebit_boundaryId=\"$boundaryId\",fusebit_functionId=\"$functionId\"} |~ \"3\\\\d{2}\\\\s[A-Z]{3,7}\\\\s\"[1s])",
            "hide": false,
            "legendFormat": "3xx",
            "refId": "3xx"
          },
          {
            "datasource": {
              "type": "loki",
              "uid": "loki"
            },
            "expr": "count_over_time({fusebit_accountId=\"$accountId\",fusebit_subscriptionId=\"$subscriptionId\",fusebit_boundaryId=\"$boundaryId\",fusebit_functionId=\"$functionId\"} |~ \"4\\\\d{2}\\\\s[A-Z]{3,7}\\\\s\"[1s])",
            "hide": false,
            "legendFormat": "4xx",
            "refId": "4xx raw"
          },
          {
            "datasource": {
              "type": "loki",
              "uid": "loki"
            },
            "expr": "count_over_time({fusebit_accountId=\"$accountId\",fusebit_subscriptionId=\"$subscriptionId\",fusebit_boundaryId=\"$boundaryId\",fusebit_functionId=\"$functionId\"} |~ \"5\\\\d{2}\\\\s[A-Z]{3,7}\\\\s\"[1s])",
            "hide": false,
            "legendFormat": "5xx",
            "refId": "5xx raw"
          }
        ],
        "title": "HTTP Request Volume by Status Code",
        "transformations": [],
        "type": "timeseries"
      },
      {
        "description": "",
        "fieldConfig": {
          "defaults": {
            "color": {
              "mode": "continuous-GrYlRd",
              "seriesBy": "min"
            },
            "custom": {
              "axisLabel": "",
              "axisPlacement": "auto",
              "barAlignment": -1,
              "drawStyle": "line",
              "fillOpacity": 100,
              "gradientMode": "scheme",
              "hideFrom": {
                "legend": false,
                "tooltip": false,
                "viz": false
              },
              "lineInterpolation": "linear",
              "lineStyle": {
                "fill": "solid"
              },
              "lineWidth": 2,
              "pointSize": 5,
              "scaleDistribution": {
                "type": "linear"
              },
              "showPoints": "auto",
              "spanNulls": true,
              "stacking": {
                "group": "A",
                "mode": "normal"
              },
              "thresholdsStyle": {
                "mode": "off"
              }
            },
            "mappings": [],
            "thresholds": {
              "mode": "percentage",
              "steps": [
                {
                  "color": "green",
                  "value": null
                },
                {
                  "color": "#EAB839",
                  "value": 50
                },
                {
                  "color": "red",
                  "value": 90
                }
              ]
            },
            "unit": "ms"
          },
          "overrides": []
        },
        "gridPos": {
          "h": 7,
          "w": 12,
          "x": 12,
          "y": 0
        },
        "hideTimeOverride": false,
        "id": 6,
        "interval": "1s",
        "maxDataPoints": 9999999,
        "options": {
          "legend": {
            "calcs": [],
            "displayMode": "hidden",
            "placement": "bottom"
          },
          "tooltip": {
            "mode": "single"
          }
        },
        "pluginVersion": "8.4.0-pre",
        "targets": [
          {
            "datasource": {
              "type": "loki",
              "uid": "loki"
            },
            "expr": "max_over_time\n(\n{fusebit_accountId=\"$accountId\",fusebit_subscriptionId=\"$subscriptionId\",fusebit_boundaryId=\"$boundaryId\",fusebit_functionId=\"$functionId\"} \n|~ \"\\\\d{3}\\\\s[A-Z]{3,7}\\\\s.*\"\n| json \n| unwrap stats_duration\n[1s]) by (stats_duration, traceID)",
            "instant": false,
            "legendFormat": "Latency = {{stats_duration}} ms | Trace ID = {{traceID}}",
            "maxLines": 0,
            "range": true,
            "refId": "A",
            "resolution": 1
          }
        ],
        "title": "HTTP Request Latency",
        "transformations": [],
        "type": "timeseries"
      },
      {
        "description": "",
        "fieldConfig": {
          "defaults": {
            "custom": {
              "align": "auto",
              "displayMode": "auto",
              "filterable": true
            },
            "mappings": [],
            "thresholds": {
              "mode": "absolute",
              "steps": [
                {
                  "color": "green",
                  "value": null
                },
                {
                  "color": "red",
                  "value": 80
                }
              ]
            }
          },
          "overrides": [
            {
              "matcher": {
                "id": "byName",
                "options": "Method"
              },
              "properties": [
                {
                  "id": "custom.width",
                  "value": 69
                }
              ]
            },
            {
              "matcher": {
                "id": "byName",
                "options": "Status Code"
              },
              "properties": [
                {
                  "id": "custom.width",
                  "value": 112
                },
                {
                  "id": "custom.displayMode",
                  "value": "color-text"
                },
                {
                  "id": "thresholds",
                  "value": {
                    "mode": "absolute",
                    "steps": [
                      {
                        "color": "green",
                        "value": null
                      },
                      {
                        "color": "yellow",
                        "value": 400
                      },
                      {
                        "color": "red",
                        "value": 500
                      }
                    ]
                  }
                }
              ]
            },
            {
              "matcher": {
                "id": "byName",
                "options": "Duration"
              },
              "properties": [
                {
                  "id": "custom.width",
                  "value": 72
                }
              ]
            },
            {
              "matcher": {
                "id": "byName",
                "options": "spanID"
              },
              "properties": [
                {
                  "id": "custom.width",
                  "value": 152
                }
              ]
            },
            {
              "matcher": {
                "id": "byName",
                "options": "Timestamp"
              },
              "properties": [
                {
                  "id": "custom.width",
                  "value": 188
                }
              ]
            },
            {
              "matcher": {
                "id": "byName",
                "options": "traceID"
              },
              "properties": [
                {
                  "id": "custom.width",
                  "value": 273
                }
              ]
            },
            {
              "matcher": {
                "id": "byName",
                "options": "Message"
              },
              "properties": [
                {
                  "id": "custom.filterable"
                },
                {
                  "id": "custom.displayMode",
                  "value": "json-view"
                }
              ]
            }
          ]
        },
        "gridPos": {
          "h": 15,
          "w": 24,
          "x": 0,
          "y": 7
        },
        "id": 4,
        "options": {
          "footer": {
            "fields": "",
            "reducer": [
              "sum"
            ],
            "show": false
          },
          "showHeader": true,
          "sortBy": [
            {
              "desc": true,
              "displayName": "Timestamp"
            }
          ]
        },
        "pluginVersion": "8.4.0-pre",
        "targets": [
          {
            "datasource": {
              "type": "loki",
              "uid": "loki"
            },
            "expr": "{fusebit_accountId=\"$accountId\",fusebit_subscriptionId=\"$subscriptionId\",fusebit_boundaryId=\"$boundaryId\",fusebit_functionId=\"$functionId\"} \n|~ \"\\\\d{3}\\\\s[A-Z]{3,7}\\\\s.*\"\n| json",
            "refId": "A"
          }
        ],
        "title": "Associated Logs",
        "transformations": [
          {
            "id": "merge",
            "options": {}
          },
          {
            "id": "extractFields",
            "options": {
              "format": "json",
              "replace": false,
              "source": "line"
            }
          },
          {
            "id": "extractFields",
            "options": {
              "format": "json",
              "source": "stats"
            }
          },
          {
            "id": "organize",
            "options": {
              "excludeByName": {
                "id": true,
                "line": true,
                "reference": true,
                "spanID": true,
                "stats": true,
                "traceID 2": true,
                "tsNs": true
              },
              "indexByName": {
                "duration": 10,
                "id": 2,
                "line": 4,
                "method": 8,
                "msg": 11,
                "reference": 7,
                "spanID": 6,
                "stats": 12,
                "statusCode": 9,
                "traceID 1": 1,
                "traceID 2": 5,
                "ts": 0,
                "tsNs": 3
              },
              "renameByName": {
                "duration": "Duration",
                "id": "",
                "line": "",
                "method": "Method",
                "msg": "Message",
                "reference": "",
                "spanID": "",
                "stats": "",
                "statusCode": "Status Code",
                "traceID": "Trace ID",
                "traceID 1": "Trace ID",
                "ts": "Timestamp"
              }
            }
          }
        ],
        "type": "table"
      }
    ],
    "refresh": "",
    "schemaVersion": 34,
    "style": "dark",
    "tags": [],
    "templating": {
      "list": [
        {
          "current": {
            "selected": false,
            "text": "acc-1111111111111111",
            "value": "acc-1111111111111111"
          },
          "hide": 2,
          "label": "Account ID",
          "name": "accountId",
          "options": [
            {
              "selected": false,
              "text": "acc-1111111111111111",
              "value": "acc-1111111111111111"
            }
          ],
          "query": "acc-1111111111111111",
          "skipUrlSync": false,
          "type": "textbox"
        },
        {
          "current": {
            "selected": false,
            "text": "sub-1111111111111111",
            "value": "sub-1111111111111111"
          },
          "hide": 2,
          "label": "Subscription ID",
          "name": "subscriptionId",
          "options": [
            {
              "selected": false,
              "text": "sub-1111111111111111",
              "value": "sub-1111111111111111"
            }
          ],
          "query": "sub-1111111111111111",
          "skipUrlSync": false,
          "type": "textbox"
        },
        {
          "current": {
            "selected": true,
            "text": "integration",
            "value": "integration"
          },
          "hide": 2,
          "label": "Integration / Connector",
          "name": "boundaryId",
          "options": [
            {
              "selected": true,
              "text": "integration",
              "value": "integration"
            }
          ],
          "query": "integration",
          "skipUrlSync": false,
          "type": "textbox"
        },
        {
          "current": {
            "selected": false,
            "text": "Integration",
            "value": "Integration"
          },
          "hide": 2,
          "label": "Integration ID",
          "name": "functionId",
          "options": [
            {
              "selected": false,
              "text": "Integration",
              "value": "Integration"
            }
          ],
          "query": "HealthTests",
          "skipUrlSync": false,
          "type": "textbox"
        }
      ]
    },
    "time": {
      "from": "now-1h",
      "to": "now"
    },
    "timepicker": {
      "hidden": false
    },
    "timezone": "",
    "title": "Health Monitoring",
    "uid": "HealthMonitor",
    "weekStart": ""
  }
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
