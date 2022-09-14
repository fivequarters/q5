PROFILE_321 := production
PROFILE_749 := dev
GOVCLOUD_PROFILE := govcloud
PROFILE_763 := selfservice

%.require-profile :
	fuse-ops profile set ${PROFILE}
	AWS_MFA_DURATION=${DURATION} fuse-ops stack ls #  -o json | jq -r '.[] | .deploymentName + ":" + (.id | tostring) + " - " + .region + " @ " + .tag '

govcloud.require-profile: PROFILE=${GOVCLOUD_PROFILE}
govcloud.require-profile: DURATION=12000

321.require-profile: PROFILE=${PROFILE_321}
321.require-profile: DURATION=12000

749.require-profile: PROFILE=${PROFILE_749}
749.require-profile: DURATION=43200

763.require-profile: PROFILE=${PROFILE_763}
763.require-profile: DURATION=12000

profile-login-fusebit: 321.require-profile
profile-login-fusebit-dev: 749.require-profile
profile-login-fusebit-govcloud: govcloud.require-profile
