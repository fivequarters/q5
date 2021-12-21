-- The grafanaStatus table holds the current grafana database version

CREATE TABLE grafanaStatus (
  mon_deployment_name VARCHAR(32) PRIMARY KEY NOT NULL,
  version INT,
  param_manager_key VARCHAR(60),
  param_manager_version VARCHAR(64),
);

REVOKE DELETE, TRUNCATE ON grafanaStatus FROM public;