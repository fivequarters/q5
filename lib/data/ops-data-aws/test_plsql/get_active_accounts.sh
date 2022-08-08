RESULT=`./shell.mjs --profile=api.us-west-1.self "SELECT accountId, jsonb_object_keys(data) as connector, COUNT(*) as NumberOfInstalls FROM entity WHERE entityType = 'install' GROUP BY accountId ORDER BY NumberOfInstalls DESC LIMIT 100"`
#RESULT=`cat sample_install_count.json`

echo ${RESULT} | jq -r '.[]|[.accountid, .numberofinstalls] | @tsv' | (
  while IFS=$'\t' read -r account installs; do
    email=`./get_email_for_account.sh ${account}`
    echo ${account} ${email} ${installs}
  done
)
