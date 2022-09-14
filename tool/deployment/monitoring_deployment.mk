include tool/deployment/profile.mk

# PRODUCTION DEPLOYMENTS

%.dev-mon-deployment: 749.require-profile
	FUSEBIT_DEBUG=1 fuse-ops monitoring add ${ARGS}

%.prod-mon-deployment: 321.require-profile
	FUSEBIT_DEBUG=1 fuse-ops monitoring add ${ARGS}

%.self-mon-deployment: 763.require-profile
	FUSEBIT_DEBUG=1 fuse-ops monitoring add ${ARGS}

deploy-monitoring-deployment-fuseprod-stage-us-west-2: stage.prod-mon-deployment
stage.prod-mon-deployment: ARGS=stage stage stage --region us-west-2

deploy-monitoring-deployment-fuseself-api-us-west-1: api.self-mon-deployment
api.self-mon-deployment: ARGS=prod api api --region us-west-1
