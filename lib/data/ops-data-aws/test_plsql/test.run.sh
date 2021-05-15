#!/bin/bash
COUNTER=0
MAX_TESTS=25

echo 'Running tests...'
while [ ${COUNTER} -lt ${MAX_TESTS} ]; do
  ./update.sh setupData.sql > /dev/null
  ./shell.sh "SELECT test_${COUNTER}();" | grep stringValue | sed "s/^/TEST ${COUNTER}/"
  let COUNTER=COUNTER+1;
done
