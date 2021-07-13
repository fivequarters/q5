const superagent = require("superagent");

const { Router, Form } = require("@fusebit-int/framework");

const FormSchema = {
  type: "object",
  properties: {
    firstName: {
      type: "string",
      minLength: 3,
      description: "Please enter your first name",
    },
    secondName: {
      type: "string",
      minLength: 3,
      description: "Please enter your second name",
    },
  },
};

const FormUiSchema = {
  type: "Group",
  label: "Asana User Details",
  elements: [
    {
      type: "HorizontalLayout",
      elements: [
        {
          type: "Control",
          scope: "#/properties/firstName",
          label: "The users first name in Asana",
        },
        {
          type: "Control",
          scope: "#/properties/secondName",
          label: "The users last name in Asana",
        },
      ],
    },
  ],
};

const FormData = {};

const getTokens = async (ctx) => {
  const response = await superagent
    .get(
      `${ctx.state.params.baseUrl}/session/result/${
        ctx.params.sessionId || ctx.query.session
      }`
    )
    .set("Authorization", `Bearer ${ctx.state.params.functionAccessToken}`);

  const connectorUrlArray = ctx.state.params.baseUrl.split("/");
  connectorUrlArray.pop();
  connectorUrlArray.pop();
  connectorUrlArray.push("connector");
  const connectorBaseUrl = connectorUrlArray.join("/");
  const createConnectorUrl = (connectorId, subordinateId) => {
    return `${connectorBaseUrl}/${connectorId}/api/session/${subordinateId}/token`;
  };
  const tokens = {};
  await Promise.all(
    Object.entries(response.body.uses).map(async ([key, value]) => {
      tokens[key] = (
        await superagent.get(
          createConnectorUrl(value.componentId, value.subordinateId)
        )
      ).body;
    })
  );
  return { tokens, output: response.body.output };
};

const router = new Router();

router.get("/api/", async (ctx) => {
  ctx.body =
    [
      ` ____  _   _  ____ ____ _____ ____ ____`,
      `/ ___|| | | |/ ___/ ___| ____/ ___/ ___|`,
      `\\___ \\| | | | |  | |   |  _| \\___ \\___ \\`,
      ` ___) | |_| | |__| |___| |___ ___) |__) |`,
      `|____/ \\___/ \\____\\____|_____|____/____/`,
    ].join("\n") +
    `\n\nSuccessfully completed the session initalization for ${ctx.query.session}\n\n` +
    `At this point, the user would be redirected back to the backend url, which would perform an authenticated call\n` +
    `to persist the configuration session to the database.`;
});

router.get("/api/aForm", async (ctx) => {
  const { tokens } = await getTokens(ctx);
  const token = tokens["conn1"];
  const Asana = require("asana");
  console.log("tokens:");
  console.log(tokens);
  const asana = await Asana.Client.create().useOauth({
    credentials: token.access_token,
  });
  const me = await asana.users.me();

  console.log("me");
  console.log(me);

  const nameArray = me.name.split(" ");
  const firstName = nameArray.shift();
  const secondName = nameArray.join(" ");

  const [form, contentType] = Form({
    ...{
      schema: FormSchema,
      uiSchema: FormUiSchema,
      data: { ...FormData, firstName, secondName },
    },
    state: ctx.query.session,
    dialogTitle: "Demonstrating Loading Details During Configuration",
    windowTitle: "Asana User Details",
    submitUrl: "aForm/submit",
    cancelUrl: "https://www.google.com",
  });
  ctx.body = form;
  ctx.response.set("Content-Type", contentType);
});
router.post("/api/aForm/submit", async (ctx) => {
  // Call backend with secret here.
  console.log("Saving data to session:");
  const payload = JSON.parse(ctx.req.body.payload);
  console.log(payload.payload);
  await superagent
    .put(`${ctx.state.params.baseUrl}/session/${payload.state}`)
    .set("Authorization", `Bearer ${ctx.state.params.functionAccessToken}`)
    .send(payload.payload);

  ctx.redirect(`${ctx.state.params.baseUrl}/session/${payload.state}/callback`);
});

router.get("/api/session/:sessionId", async (ctx) => {
  const { tokens, output } = await getTokens(ctx);
  ctx.body = { tokens, output };
});

router.get("/api/asana/:tenantId", async (ctx) => {
  try {
    const oauth = await ctx.state.manager.connectors.getByName(
      "oauth1",
      (ctx) => ctx.params.tenantId
    )(ctx);
    // Example usage with Asana
    const Asana = require("asana");
    const asana = await Asana.Client.create().useOauth({
      credentials: oauth.accessToken,
    });
    ctx.body = await asana.users.me();
  } catch (e) {
    ctx.body = `Unable to acquire oauth token - reconfigure? - ${e}`;
    ctx.status = 500;
  }
});

module.exports = router;
