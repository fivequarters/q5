---
inject: true
to: tool/cicd/actions/yaml/publish_proxy_secrets.yml
after: '# -- Hygen -- proxy-secrets'
---
<%="      " %>PROXY_<%= h.changeCase.upper(name) %>_CLIENT_ID: ${{ secrets.PROXY_<%= h.changeCase.upper(name) %>_CLIENT_ID }}
<%="      " %>PROXY_<%= h.changeCase.upper(name) %>_CLIENT_SECRET: ${{ secrets.PROXY_<%= h.changeCase.upper(name) %>_CLIENT_SECRET }}