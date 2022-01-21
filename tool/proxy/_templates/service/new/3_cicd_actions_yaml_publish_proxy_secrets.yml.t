---
inject: true
to: ../../tool/cicd/actions/yaml/publish_proxy_secrets.yml
after: PROXY_<%= h.changeCase.upper(h.config().lastConnector) %>_CLIENT_SECRET
---
<%="      " %>PROXY_<%= h.changeCase.upper(name) %>_CLIENT_ID: ${{ secrets.PROXY_<%= h.changeCase.upper(name) %>_CLIENT_ID }}
<%="      " %>PROXY_<%= h.changeCase.upper(name) %>_CLIENT_SECRET: ${{ secrets.PROXY_<%= h.changeCase.upper(name) %>_CLIENT_SECRET }}