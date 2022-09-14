include tool/deployment/profile.mk

.ONESHELL:

DEFAULT_GRAFANA_VER:=`curl -s https://raw.githubusercontent.com/fusebit/grafana/fusebit-v1.0.0-v8.3.3/.fusebit.version.json | jq -rc ".version"`

%.stack-mon-prod: 321.require-profile
	fuse-ops monitoring stack add ${NAME} --grafanaTag ${DEFAULT_GRAFANA_VER} --region ${REGION}

%.stack-mon-self: IMG_VER:=`jq -rc ".version" package.json`
%.stack-mon-self: 763.require-profile
	fuse-ops monitoring stack add ${NAME} --grafanaTag ${DEFAULT_GRAFANA_VER} --region ${REGION}

%.stack-mon-dev: IMG_VER:=`jq -rc ".version" package.json`
%.stack-mon-dev: 749.require-profile
	fuse-ops monitoring stack add ${NAME} --grafanaTag ${DEFAULT_GRAFANA_VER} --region ${REGION}

deploy-stack-monitoring-fuseprod-stage-us-west-2: stage-us-west-2.stack-mon-prod
stage-us-west-2.stack-mon-prod: NAME=stage
stage-us-west-2.stack-mon-prod: REGION=us-west-2

deploy-stack-monitoring-fuseself-api-us-west-1: api-us-west-1.stack-mon-self
api-us-west-1.stack-mon-self: NAME=api
api-us-west-1.stack-mon-self: REGION=us-west-1

deploy-stack-monitoring-fusedev-benn-us-west-1: benn3-us-west-1.stack-mon-dev
benn3-us-west-1.stack-mon-dev: NAME=benn3
benn3-us-west-1.stack-mon-dev: REGION=us-west-1
