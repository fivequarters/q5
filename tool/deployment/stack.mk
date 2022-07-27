include tool/deployment/profile.mk

.ONESHELL:

%.stack-prod: IMG_VER:=`jq -rc ".version" package.json`
%.stack-prod: 321.require-profile
	fuse-ops stack add ${NAME} ${IMG_VER} --region ${REGION} --size ${SIZE} --confirm false --env .env.dwh.logs 

%.stack-self: IMG_VER:=`jq -rc ".version" package.json`
%.stack-self: 763.require-profile
	fuse-ops stack add ${NAME} ${IMG_VER} --region ${REGION} --size ${SIZE} --confirm false --env .env.dwh.logs 

%.stack-dev: IMG_VER:=`jq -rc ".version" package.json`
%.stack-dev: 749.require-profile
	fuse-ops stack add ${NAME} ${IMG_VER} --region ${REGION} --size ${SIZE} --confirm false

# NEW STUFF BELOW

%.stack-rotate-dev: IMG_VER:=`jq -rc ".version" package.json`
%.stack-rotate-dev: 749.require-profile
	./tool/deployment/rotate_stacks.mjs -d ${NAME} -r ${REGION} -s ${IMG_VER} -p"--size ${SIZE} $(if ${USE_ENV},--env .env.dwh.logs,)"

%.stack-rotate-prod: IMG_VER:=`jq -rc ".version" package.json`
%.stack-rotate-prod: 321.require-profile
	./tool/deployment/rotate_stacks.mjs -d ${NAME} -r ${REGION} -s ${IMG_VER} -p"--size ${SIZE} $(if ${USE_ENV},--env .env.dwh.logs,)"

%.stack-rotate-self: IMG_VER:=`jq -rc ".version" package.json`
%.stack-rotate-self: 763.require-profile
	./tool/deployment/rotate_stacks.mjs -d ${NAME} -r ${REGION} -s ${IMG_VER} -p"--size ${SIZE} $(if ${USE_ENV},--env .env.dwh.logs,)"

deploy-stack-fuseprod-api-us-east-1: api-us-east-1.stack-prod
api-us-east-1.stack-prod: NAME=api
api-us-east-1.stack-prod: REGION=us-east-1
api-us-east-1.stack-prod: SIZE=2

deploy-stack-fuseprod-stage-us-west-2: stage-us-west-2.stack-prod
stage-us-west-2.stack-prod: NAME=stage
stage-us-west-2.stack-prod: REGION=us-west-2
stage-us-west-2.stack-prod: SIZE=1

deploy-stack-fuseprod-stage-eu-north-1: stage-eu-north-1.stack-prod
stage-eu-north-1.stack-prod: NAME=stage
stage-eu-north-1.stack-prod: REGION=eu-north-1
stage-eu-north-1.stack-prod: SIZE=2

deploy-stack-fuseprod-api-us-west-1: api-us-west-1.stack-prod
api-us-west-1.stack-prod: NAME=api
api-us-west-1.stack-prod: REGION=us-west-1
api-us-west-1.stack-prod: SIZE=2

deploy-stack-fusedev-benn-us-west-1: benn-us-west-1.stack-dev
benn-us-west-1.stack-dev: NAME=benn
benn-us-west-1.stack-dev: REGION=us-west-1
benn-us-west-1.stack-dev: SIZE=1

deploy-stack-fusedev-dev-us-west-1: dev-us-west-1.stack-dev
dev-us-west-1.stack-dev: NAME=dev
dev-us-west-1.stack-dev: REGION=us-west-1
dev-us-west-1.stack-dev: SIZE=1

deploy-stack-fusedev-test-us-west-2: test-us-west-2.stack-dev
test-us-west-2.stack-dev: NAME=test
test-us-west-2.stack-dev: REGION=us-west-2
test-us-west-2.stack-dev: SIZE=1

deploy-stack-fuseself-api-us-west-1: api-us-west-1.stack-self
api-us-west-1.stack-self: NAME=api
api-us-west-1.stack-self: REGION=us-west-1
api-us-west-1.stack-self: SIZE=2

deploy-stack-fuseprod-api-eu-west-3: api-eu-west-3.stack-prod
api-eu-west-3.stack-prod: NAME=api
api-eu-west-3.stack-prod: REGION=eu-west-3
api-eu-west-3.stack-prod: SIZE=2

deploy-stack-fuseprod-api-eu-central-1: stage-eu-central-1.stack-prod
stage-eu-central-1.stack-prod: NAME=api
stage-eu-central-1.stack-prod: REGION=eu-central-1
stage-eu-central-1.stack-prod: SIZE=2

deploy-stack-rotate-fusedev-benn-us-west-1: fusedev-benn-us-west-1.stack-rotate-dev
fusedev-benn-us-west-1.stack-rotate-dev: NAME=benn
fusedev-benn-us-west-1.stack-rotate-dev: REGION=us-west-1
fusedev-benn-us-west-1.stack-rotate-dev: SIZE=1

deploy-stack-rotate-fusedev-dev-us-west-1: fusedev-dev-us-west-1.stack-rotate-dev
fusedev-dev-us-west-1.stack-rotate-dev: NAME=dev
fusedev-dev-us-west-1.stack-rotate-dev: REGION=us-west-1
fusedev-dev-us-west-1.stack-rotate-dev: SIZE=1

deploy-stack-rotate-fuseself-api-us-west-1: fuseself-api-us-west-1.stack-rotate-self
fuseself-api-us-west-1.stack-rotate-self: NAME=api
fuseself-api-us-west-1.stack-rotate-self: REGION=us-west-1
fuseself-api-us-west-1.stack-rotate-self: SIZE=2
fuseself-api-us-west-1.stack-rotate-self: USE_ENV=1

deploy-stack-rotate-fuseprod-stage-us-west-2: fuseprod-stage-us-west-2.stack-rotate-prod
fuseprod-stage-us-west-2.stack-rotate-prod: NAME=stage
fuseprod-stage-us-west-2.stack-rotate-prod: REGION=us-west-2
fuseprod-stage-us-west-2.stack-rotate-prod: SIZE=1
fuseprod-stage-us-west-2.stack-rotate-prod: USE_ENV=1

deploy-stack-rotate-fuseprod-api-eu-central-1: fuseprod-api-eu-central-1.stack-rotate-prod
fuseprod-api-eu-central-1.stack-rotate-prod: NAME=api
fuseprod-api-eu-central-1.stack-rotate-prod: REGION=eu-central-1
fuseprod-api-eu-central-1.stack-rotate-prod: SIZE=2
fuseprod-api-eu-central-1.stack-rotate-prod: USE_ENV=1

deploy-stack-rotate-fuseprod-api-us-west-1: fuseprod-api-us-west-1.stack-rotate-prod
fuseprod-api-us-west-1.stack-rotate-prod: NAME=api
fuseprod-api-us-west-1.stack-rotate-prod: REGION=us-west-1
fuseprod-api-us-west-1.stack-rotate-prod: SIZE=2
fuseprod-api-us-west-1.stack-rotate-prod: USE_ENV=1

deploy-stack-rotate-fuseprod-api-us-east-1: fuseprod-api-us-east-1.stack-rotate-prod
fuseprod-api-us-east-1.stack-rotate-prod: NAME=api
fuseprod-api-us-east-1.stack-rotate-prod: REGION=us-east-1
fuseprod-api-us-east-1.stack-rotate-prod: SIZE=2
fuseprod-api-us-east-1.stack-rotate-prod: USE_ENV=1

