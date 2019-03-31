export function serializeKeyValue(data: { [property: string]: string | number | undefined }) {
  const lines: string[] = [];
  Object.keys(data)
    .sort()
    .forEach(key => {
      if (data[key]) {
        lines.push(`${key}=${data[key]}`);
      }
    });
  return lines.length > 0 ? lines.join('\n') : undefined;
}

export function parseKeyValue(data: string) {
  const param = /^\s*([^=]+?)\s*=\s*(.*?)\s*$/;
  const value: { [property: string]: string | number } = {};
  const lines = data.split(/[\r\n]+/);
  lines.forEach(line => {
    if (/^\s*\#/.test(line)) {
      return;
    }
    const match = line.match(param);
    if (match) {
      value[match[1]] = match[2];
    }
  });
  return value;
}
