
OPS_PROFILE_NAME=`echo ${SECRET_FUSEBIT_PROFILE} | jq -r '.ops.profileName'`
OPS_PROFILE=`echo ${SECRET_FUSEBIT_PROFILE} | jq -r '.ops.settings.profiles["'${OPS_PROFILE_NAME}'"]'`
echo ${SECRET_FUSEBIT_PROFILE} | jq -r '.ops.settings'

echo "Creating ~/.aws/config"
echo "[default]"
echo "region = us-west-2"

echo "Creating ~/.aws/credentials"
echo "[default]"
echo "aws_access_key_id = `echo ${OPS_PROFILE} | jq -r '.awsAccessKeyId'`"
echo "aws_secret_access_key = `echo ${OPS_PROFILE} | jq -r '.awsSecretAccessKey'`"
