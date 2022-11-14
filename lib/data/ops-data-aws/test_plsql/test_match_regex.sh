foo() {
  ./shell.mjs --profile benn.dev  \
  "SELECT baseQuery.* FROM
    (SELECT * FROM entity WHERE entityId LIKE '/integration/%' AND entitytype = 'install' AND tags ??& ARRAY['test-function-1']::text[]) AS baseQuery,
    (SELECT * FROM entity WHERE entityType = 'integration') AS parentQuery
    WHERE parentQuery.id = substring(baseQuery.entityId FROM '/integration/([0-9]+)/')::integer";

  # WHERE parentQuery.id = substring(baseQuery.entityId FROM '/integration/([0-9]+)/')::integer";
}

foo2() {
  ./shell.mjs --profile benn.dev  \
  "SELECT entityQuery.* FROM entity as entityQuery, (SELECT * FROM entity WHERE entityType = 'integration') AS parentQuery
    WHERE entityQuery.entityId LIKE '/integration/%' AND entityQuery.entitytype = 'install' AND entityQuery.tags ??& ARRAY['test-function-1']::text[]
    AND parentQuery.id = substring(entityQuery.entityId FROM '/integration/([0-9]+)/')::integer";

  # WHERE parentQuery.id = substring(baseQuery.entityId FROM '/integration/([0-9]+)/')::integer";
}

foo3() {
  ./shell.mjs --profile benn.dev  \
  "SELECT entityQuery.* FROM entity as entityQuery, (SELECT * FROM entity WHERE entityType = 'connector') AS parentQuery
    WHERE entityQuery.entityId LIKE '/connector/%' AND entityQuery.entitytype = 'identity' AND entityQuery.tags ??& ARRAY['test.createSubEntityTag']::text[]
    AND parentQuery.id = substring(entityQuery.entityId FROM '/connector/([0-9]+)/')::integer";

  # WHERE parentQuery.id = substring(baseQuery.entityId FROM '/integration/([0-9]+)/')::integer";
}

bar() {
./shell.mjs --profile benn.dev  \
  "SELECT baseQuery.entityId, substring(baseQuery.entityId FROM '/integration/([0-9]+)/')::integer as parentId FROM
    (SELECT * FROM entity WHERE entityId LIKE '/integration/%' AND entitytype = 'install' AND tags ??& ARRAY['test-function-1']::text[]) AS baseQuery
    ";
  }

foo3
