export function getTheme(props: any, ...path: Array<string | number>): any {
  const theme = props.theme || props;
  if (theme && theme.components) {
    let next: any = theme.components;
    for (const segment of path) {
      if (!next[segment]) {
        return {};
      }
      next = next[segment];
    }
    return next;
  }
  return {};
}
