const parseElasticSearchUrl = (url: string): { username: string; password: string; hostname: string } | undefined => {
  let esCreds = url.match(/https:\/\/([^:]+):(.*)@([^@]+$)/i);
  if (esCreds && esCreds[1] && esCreds[2] && esCreds[3]) {
    return { username: esCreds[1], password: esCreds[2], hostname: esCreds[3] };
  }
  return undefined;
};

export { parseElasticSearchUrl };
