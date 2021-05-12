-- Create functions
CREATE OR REPLACE FUNCTION delete_on_version(eType entity_type, aId VARCHAR, sId VARCHAR,
    prefixMatchId BOOLEAN, eId VARCHAR, entityIdPrefix VARCHAR, filterExpired BOOLEAN, ver BIGINT) RETURNS INTEGER AS $$
  DECLARE
    deletecursor CURSOR FOR
      SELECT * FROM entity
      WHERE entityType = eType
        AND accountId = aId
        AND subscriptionId = sId
        AND (prefixMatchId OR entityId = eId)
        AND (NOT prefixMatchId OR entityId LIKE FORMAT('%s%%', entityIdPrefix))
        AND (NOT filterExpired OR expires IS NULL OR expires > NOW());
    targetEntity entity%ROWTYPE;
    deleted_cnt INTEGER;
  BEGIN
    OPEN deletecursor;
    FETCH FIRST FROM deletecursor INTO targetEntity;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'not_found' USING errcode = '22001';
    END IF;

    IF targetEntity.version != ver THEN
      RAISE EXCEPTION 'conflict' USING errcode = '22000';
    END IF;

    DELETE FROM entity WHERE CURRENT OF deletecursor;
    GET DIAGNOSTICS deleted_cnt = ROW_COUNT;
    RETURN deleted_cnt;
  END;
  $$ LANGUAGE PLPGSQL;
