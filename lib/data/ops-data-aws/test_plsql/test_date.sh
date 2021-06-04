PROFILE=benn.dev ./shell.sh  "UPDATE entity SET expires = '2021-06-02T20:25:25.817Z'::timestamptz WHERE accountId = 'acc-1234'" &&
  PROFILE=benn.dev ./shell.sh "SELECT expires, EXTRACT(timezone from expires), to_json(expires)#>>'{}' FROM entity WHERE accountId = 'acc-1234'"
