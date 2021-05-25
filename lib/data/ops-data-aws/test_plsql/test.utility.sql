-- NOT_FOUND
CREATE OR REPLACE FUNCTION test_0() RETURNS VARCHAR AS $$
BEGIN
  SELECT check_if_version('connector', 'acc-NNNN', 'sub-1', 'ent-1', TRUE, FALSE, 'a');
  RAISE EXCEPTION 'FAILED test_0';
EXCEPTION WHEN SQLSTATE '22001' THEN RETURN 'SUCCESS';
END; $$ LANGUAGE PLPGSQL;

-- CONFLICT_DATA
CREATE OR REPLACE FUNCTION test_1() RETURNS VARCHAR AS $$
BEGIN
  SELECT check_if_version('connector', 'acc-1', 'sub-1', 'ent-1', TRUE, FALSE, 'A');
  RAISE EXCEPTION 'FAILED test_1';
EXCEPTION WHEN SQLSTATE '22002' THEN RETURN 'SUCCESS';
END; $$ LANGUAGE PLPGSQL;

-- OKAY - NO VERSION
CREATE OR REPLACE FUNCTION test_2() RETURNS VARCHAR AS $$
BEGIN
  PERFORM check_if_version('connector', 'acc-1', 'sub-1', 'ent-1', TRUE, FALSE, NULL);
  RETURN 'SUCCESS';
END; $$ LANGUAGE PLPGSQL;

-- OKAY - VERSION
CREATE OR REPLACE FUNCTION test_3() RETURNS VARCHAR AS $$
BEGIN
  PERFORM check_if_version('connector', 'acc-1', 'sub-1', 'ent-1', TRUE, FALSE, 'a');
  RETURN 'SUCCESS';
END; $$ LANGUAGE PLPGSQL;

-- OKAY - NO DATA
CREATE OR REPLACE FUNCTION test_4() RETURNS VARCHAR AS $$
BEGIN
  PERFORM check_if_version('connector', 'acc-1', 'sub-1', 'ent-1', TRUE, FALSE, 'a');
  RETURN 'SUCCESS';
END; $$ LANGUAGE PLPGSQL;

-- OKAY
CREATE OR REPLACE FUNCTION test_5() RETURNS VARCHAR AS $$
BEGIN
  RETURN 'SUCCESS';
END; $$ LANGUAGE PLPGSQL;

-- NOT FOUND
CREATE OR REPLACE FUNCTION test_6() RETURNS VARCHAR AS $$
BEGIN
  SELECT * FROM update_if_version('connector', 'acc-NNNN', 'sub-1', 'ent-1', TRUE, FALSE, FALSE, '"d"'::jsonb, '"t"'::jsonb, NULL, 'a');
  RAISE EXCEPTION 'FAILED test_6';
EXCEPTION WHEN SQLSTATE '22001' THEN RETURN 'SUCCESS';
END; $$ LANGUAGE PLPGSQL;

-- CONFLICT_DATA
CREATE OR REPLACE FUNCTION test_7() RETURNS VARCHAR AS $$
BEGIN
  SELECT * FROM update_if_version('connector', 'acc-1', 'sub-1', 'ent-1', TRUE, FALSE, FALSE, '"d"'::jsonb, '"t"'::jsonb, NULL, 'A');
  RAISE EXCEPTION 'FAILED test_7';
EXCEPTION WHEN SQLSTATE '22002' THEN RETURN 'SUCCESS';
END; $$ LANGUAGE PLPGSQL;

-- OKAY
CREATE OR REPLACE FUNCTION test_8() RETURNS VARCHAR AS $$
DECLARE
  result RECORD;
BEGIN
  SELECT * FROM update_if_version('connector', 'acc-1', 'sub-1', 'ent-1', TRUE, FALSE, FALSE, '"d"'::jsonb, '"t"'::jsonb, NULL, 'a') INTO result;
  IF result.version = 'a' THEN RAISE EXCEPTION 'FAILED test_8'; END IF;
  RETURN 'SUCCESS';
END; $$ LANGUAGE PLPGSQL;

CREATE OR REPLACE FUNCTION test_9() RETURNS VARCHAR AS $$
DECLARE
  result RECORD;
BEGIN
  SELECT * FROM update_if_version('connector', 'acc-1', 'sub-1', 'ent-1', TRUE, FALSE, FALSE, '"d"'::jsonb, NULL, NULL, 'a') INTO result;
  IF result.version = 'a' THEN RAISE EXCEPTION 'FAILED test_9'; END IF;
  RETURN 'SUCCESS';
END; $$ LANGUAGE PLPGSQL;

CREATE OR REPLACE FUNCTION test_10() RETURNS VARCHAR AS $$
DECLARE
  result RECORD;
BEGIN
  SELECT * FROM update_if_version('connector', 'acc-1', 'sub-1', 'ent-1', TRUE, FALSE, FALSE, NULL, '"tt"', NULL, 'a') INTO result;
  IF result.version = 'a' THEN RAISE EXCEPTION 'FAILED test_10'; END IF;
  RETURN 'SUCCESS';
END; $$ LANGUAGE PLPGSQL;

CREATE OR REPLACE FUNCTION test_11() RETURNS VARCHAR AS $$
DECLARE
  result RECORD;
BEGIN
  SELECT * FROM update_if_version('connector', 'acc-1', 'sub-1', 'ent-1', TRUE, FALSE, FALSE, NULL, '"tt"', NULL) INTO result;
  IF result.version = 'a' THEN RAISE EXCEPTION 'FAILED test_11'; END IF;
  RETURN 'SUCCESS';
END; $$ LANGUAGE PLPGSQL;

-- DELETES
-- NOT FOUND
CREATE OR REPLACE FUNCTION test_12() RETURNS VARCHAR AS $$
BEGIN
  SELECT delete_if_version('connector', 'acc-NNNN', 'sub-1', 'ent-1', TRUE, FALSE, 'a');
  RAISE EXCEPTION 'FAILED test_12';
  EXCEPTION WHEN SQLSTATE '22001' THEN RETURN 'SUCCESS';
END; $$ LANGUAGE PLPGSQL;

-- CONFLICT_DATA
CREATE OR REPLACE FUNCTION test_13() RETURNS VARCHAR AS $$
BEGIN
  SELECT delete_if_version('connector', 'acc-1', 'sub-1', 'ent-1', TRUE, FALSE, 'A');
  RAISE EXCEPTION 'FAILED test_13';
  EXCEPTION WHEN SQLSTATE '22002' THEN RETURN 'SUCCESS';
END; $$ LANGUAGE PLPGSQL;

-- OKAY
CREATE OR REPLACE FUNCTION test_14() RETURNS VARCHAR AS $$
DECLARE
  result RECORD;
  test RECORD;
BEGIN
  SELECT 1 INTO test;
  SELECT * FROM delete_if_version('connector', 'acc-1', 'sub-1', 'ent-1', TRUE, FALSE, 'a') INTO result;
  IF result <> test THEN
    RAISE EXCEPTION 'FAILED test_14: % != %', result, test;
  END IF;
  RETURN 'SUCCESS';
END; $$ LANGUAGE PLPGSQL;

CREATE OR REPLACE FUNCTION test_15() RETURNS VARCHAR AS $$
DECLARE
  result RECORD;
  test RECORD;
BEGIN
  SELECT 1 INTO test;
  SELECT * FROM delete_if_version('connector', 'acc-1', 'sub-1', 'ent-1', TRUE, FALSE, NULL) INTO result;
  IF result <> test THEN
    RAISE EXCEPTION 'FAILED test_15: % != %', result, test;
  END IF;
  RETURN 'SUCCESS';
END; $$ LANGUAGE PLPGSQL;

CREATE OR REPLACE FUNCTION test_16() RETURNS VARCHAR AS $$
DECLARE
  result RECORD;
  test RECORD;
BEGIN
  SELECT 1 INTO test;
  SELECT * FROM delete_if_version('connector', 'acc-1', 'sub-1', 'ent-1', TRUE, FALSE) INTO result;
  IF result <> test THEN
    RAISE EXCEPTION 'FAILED test_16: % != %', result, test;
  END IF;
  RETURN 'SUCCESS';
END; $$ LANGUAGE PLPGSQL;

CREATE OR REPLACE FUNCTION test_17() RETURNS VARCHAR AS $$
DECLARE
  result RECORD;
BEGIN
  SELECT * FROM update_tag_if_version('connector', 'acc-1', 'sub-1', 'ent-1', TRUE, FALSE, 'monkey', '"banana"') INTO result;
  IF result.tags->>'monkey' <> 'banana'  THEN
    RAISE EXCEPTION 'FAILED test_17';
  END IF;
  RETURN 'SUCCESS';
END; $$ LANGUAGE PLPGSQL;

CREATE OR REPLACE FUNCTION test_18() RETURNS VARCHAR AS $$
DECLARE
  result RECORD;
BEGIN
  SELECT * FROM update_tag_if_version('connector', 'acc-1', 'sub-1', 'ent-1', TRUE, FALSE, 'monkey', '"banana"', 'A') INTO result;
  RAISE EXCEPTION 'FAILED test_18';
  EXCEPTION WHEN SQLSTATE '22002' THEN RETURN 'SUCCESS';
END; $$ LANGUAGE PLPGSQL;

CREATE OR REPLACE FUNCTION test_19() RETURNS VARCHAR AS $$
DECLARE
  result RECORD;
BEGIN
  SELECT * FROM delete_tag_if_version('connector', 'acc-1', 'sub-1', 'ent-1', TRUE, FALSE, 'foo') INTO result;
  IF result.tags->>'foo' = 'bar'  THEN
    RAISE EXCEPTION 'FAILED test_19';
  END IF;
  RETURN 'SUCCESS';
END; $$ LANGUAGE PLPGSQL;

-- RECURSIVE DELETE
CREATE OR REPLACE FUNCTION test_20() RETURNS VARCHAR AS $$
DECLARE
  test RECORD;
  result RECORD;
BEGIN
  SELECT 4 INTO test;

  -- Present from data setup.
  -- INSERT INTO entity VALUES(DEFAULT, 'connector', 'acc-1', 'sub-1', 'ent-1', 'a', '"hello world"', '{"foo": "bar"}');
  INSERT INTO entity VALUES(DEFAULT, 'connector', 'acc-1', 'sub-1', 'ent-2', 'a', '"hello world"', '{"foo": "bar"}');
  INSERT INTO entity VALUES(DEFAULT, 'connector', 'acc-1', 'sub-1', 'ent-3', 'a', '"hello world"', '{"foo": "bar"}');
  INSERT INTO entity VALUES(DEFAULT, 'connector', 'acc-1', 'sub-1', 'ent-4', 'a', '"hello world"', '{"foo": "bar"}');

  SELECT * FROM delete_if_version('connector', 'acc-1', 'sub-1', 'ent', TRUE, TRUE) INTO result;
  IF result <> test THEN
    RAISE EXCEPTION 'FAILED test_20: % != %', result, test;
  END IF;
  RETURN 'SUCCESS';
END; $$ LANGUAGE PLPGSQL;

-- DATA_CONFLICT
CREATE OR REPLACE FUNCTION test_21() RETURNS VARCHAR AS $$
DECLARE
  result RECORD;
BEGIN
  SELECT * FROM update_if_version('connector', 'acc-1', 'sub-1', 'ent-1', TRUE, FALSE, FALSE, NULL, '"t"'::jsonb, NULL, 'A') INTO result;
  RAISE EXCEPTION 'FAILED test_21';
EXCEPTION WHEN SQLSTATE '22002' THEN RETURN 'SUCCESS';
END; $$ LANGUAGE PLPGSQL;

-- EXPIRES UPDATE
CREATE OR REPLACE FUNCTION test_22() RETURNS VARCHAR AS $$
DECLARE
  result RECORD;
BEGIN
  SELECT * FROM update_if_version('connector', 'acc-1', 'sub-1', 'ent-1', TRUE, FALSE, FALSE, '"d"'::jsonb, '"t"'::jsonb, '2999-10-19 10:23:54+02'::timestamptz, 'a') INTO result;
  IF result.expires = '2970-01-01 00:00:00+00' THEN RAISE EXCEPTION 'FAILED test_22.a: %', result.expires; END IF;
  IF result.expires <> '2999-10-19 10:23:54+02'::timestamptz THEN RAISE EXCEPTION 'FAILED test_22.b: %', result.expires; END IF;
  RETURN 'SUCCESS';
END; $$ LANGUAGE PLPGSQL;

-- ILLEGAL USE OF UPSERT AND EXPIRED
CREATE OR REPLACE FUNCTION test_23() RETURNS VARCHAR AS $$
DECLARE
  result RECORD;
BEGIN
  SELECT * FROM update_if_version('connector', 'acc-1', 'sub-1', 'ent-1', TRUE, FALSE, TRUE, '"d"'::jsonb, '"t"'::jsonb, NULL) INTO result;
  RAISE EXCEPTION 'FAILED test_21';
	EXCEPTION WHEN SQLSTATE '22003' THEN RETURN 'SUCCESS';
END; $$ LANGUAGE PLPGSQL;

-- UPSERT SUPPORT
CREATE OR REPLACE FUNCTION test_24() RETURNS VARCHAR AS $$
DECLARE
  result RECORD;
BEGIN
  SELECT * FROM update_if_version('connector', 'acc-1', 'sub-1', 'ent-5', FALSE, FALSE, TRUE, '"d"'::jsonb, '"t"'::jsonb, '2999-10-19 10:23:54+02'::timestamptz, 'a') INTO result;
  IF result.entityId <> 'ent-5' THEN RAISE EXCEPTION 'FAILED test_24.a: %', result.entityId; END IF;
  IF result.expires <> '2999-10-19 10:23:54+02'::timestamptz THEN RAISE EXCEPTION 'FAILED test_24.b: %', result.expires; END IF;
  IF result.data <> '"d"'::jsonb THEN RAISE EXCEPTION 'FAILED test_24.c: %', result.data; END IF;
  IF result.tags <> '"t"'::jsonb THEN RAISE EXCEPTION 'FAILED test_24.d: %', result.tags; END IF;
  RETURN 'SUCCESS';
END; $$ LANGUAGE PLPGSQL;

