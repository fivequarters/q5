---
inject: true
to: ../../tool/cicd/actions/scripts/publish_proxy_secrets.sh
after: <%= h.changeCase.upper(h.config().lastConnector) %>_SECRET_PAYLOAD
---
<%- %>
<%= h.changeCase.upper(name) %>_SECRET_PAYLOAD="{\"data\":{\"clientId\":\"${PROXY_<%= h.changeCase.upper(name)  %>_CLIENT_ID}\",\"clientSecret\":\"${PROXY_<%= h.changeCase.upper(name)  %>_CLIENT_SECRET}\",\"authorizationUrl\":\"<%= connector.authorizationUrl %>\",\"tokenUrl\":\"<%= connector.tokenUrl %>\",\"revokeUrl\":\"<%= connector.revokeUrl %>\"}}"
