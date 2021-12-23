import * as GrafanaConfig from '@5qtrs/grafana-config';

console.log(GrafanaConfig.toIniFile(GrafanaConfig.getConfigTemplate()));
