const flows = [
  {
    id: "oauth-implicit",
    description: "Fusebit Portal",
    usage: "Portal"
  },
  {
    id: "oauth-device",
    description: "Fusebit CLI using OAuth",
    usage: "CLI"
  },
  {
    id: "pki",
    description: "Fusebit CLI using a public/private key pair",
    usage: "CLI"
  }
];

const flowsHash = flows.reduce<any>((current, value) => {
  current[value.id] = value;
  return current;
}, {});

const noFlow = {
  id: "none",
  description: "No tools",
  usage: "None"
};

flowsHash[noFlow.id] = noFlow;

export { flows, flowsHash, noFlow };
