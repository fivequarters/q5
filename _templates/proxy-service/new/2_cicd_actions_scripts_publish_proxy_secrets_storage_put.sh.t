---
inject: true
to: tool/cicd/actions/scripts/publish_proxy_secrets.sh
after: '# -- Hygen -- proxy-list'
---
<%="  " %>echo ${<%= h.changeCase.upper(name) %>_SECRET_PAYLOAD} | fuse storage put - --storageId proxy/<%= h.changeCase.lower(name) %>/configuration