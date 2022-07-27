include tool/deployment/profile.mk

# PRODUCTION DEPLOYMENTS

%.dev-deployment: 749.require-profile
	fuse-ops -c false deployment add ${ARGS} --dataWarehouse false --segmentKey ""

%.prod-deployment: 321.require-profile .env.dwh.logs
	`cat .env.dwh.logs | sed 's/^/export /'` && FUSEBIT_DEBUG=1 fuse-ops -v -c false deployment add ${ARGS} --dataWarehouse true --segmentKey ""

%.self-deployment: 763.require-profile .env.dwh.logs
	`cat .env.dwh.logs | sed 's/^/export /'` && FUSEBIT_DEBUG=1 fuse-ops -v -c false deployment add ${ARGS} --dataWarehouse true --segmentKey ""

deploy-deployment-fusedev-test-us-west-2: dev-test.dev-deployment
dev-test.dev-deployment: ARGS=test test dev.fusebit.io --region us-west-2 --size 1

deploy-deployment-fusedev-benn-us-west-1: dev-benn.dev-deployment
dev-benn.dev-deployment: ARGS=benn dev dev.fusebit.io --region us-west-1 --size 1 --grafana benn3

deploy-deployment-fusedev-dev-us-west-1: dev.dev-deployment
dev.dev-deployment: ARGS=dev dev dev.fusebit.io --region us-west-1 --size 1

deploy-deployment-fuseprod-beta-us-west-2: beta.prod-deployment
beta.prod-deployment: ARGS=beta stage fusebit.io --region us-west-2 --size 1

deploy-deployment-fuseprod-stage-us-west-2: stage.prod-deployment
stage.prod-deployment: ARGS=stage stage fusebit.io --region us-west-2 --size 1 --grafana stage

deploy-deployment-fuseprod-stage-eu-north-1: eu.prod-deployment
eu.prod-deployment: ARGS=stage stage-eu fusebit.io --region eu-north-1 --size 1 --elasticSearch ''

deploy-deployment-fuseprod-api-us-west-1: api-us-west-1.prod-deployment
api-us-west-1.prod-deployment: ARGS=api prod fusebit.io --region us-west-1 --size 2

deploy-deployment-fuseprod-api-us-east-1: api-us-east-1.prod-deployment
api-us-east-1.prod-deployment: ARGS=api prod fusebit.io --region us-east-1 --size 2

deploy-deployment-fuseprod-api-eu-west-3: api-eu-west-3.prod-deployment
api-eu-west-3.prod-deployment: ARGS=api prod fusebit.io --region eu-west-3 --size 2

deploy-deployment-fuseprod-api-eu-central-1: api-eu-central-1.prod-deployment
api-eu-central-1.prod-deployment: ARGS=api prod fusebit.io --region eu-central-1 --size 2

deploy-deployment-fuseself-api-us-west-1: api-us-west-1.self-deployment
api-us-west-1.self-deployment: ARGS=api prod on.fusebit.io --region us-west-1 --size 2 --grafana api

