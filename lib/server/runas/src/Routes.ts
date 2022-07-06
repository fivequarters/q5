import { IFunctionSummary, IFunctionParams, IRoute } from './Request';

// Return first route that has a path prefix-matching the request path by entire segment,
// or undefined if no routes match
const getMatchingRoute = (functionSummary: IFunctionSummary, params: { functionPath: string }) =>
  (functionSummary.routes || []).find((route) => {
    console.log(`Evaluating ${route.path} vs ${params.functionPath}`);
    const index = params.functionPath.indexOf(route.path);
    const lastPathCharacter = route.path[route.path.length - 1];
    console.log(
      `index ${index}, ${
        params.functionPath === route.path ||
        lastPathCharacter === '/' ||
        ['/', '#', '?'].indexOf(params.functionPath[route.path.length]) >= 0
      }`
    );
    return (
      index === 0 &&
      // ensure entire url segment matches
      (params.functionPath === route.path ||
        lastPathCharacter === '/' ||
        ['/', '#', '?'].indexOf(params.functionPath[route.path.length]) >= 0)
    );
  });

const getExactRoute = (routes: IRoute[], path: string) => routes.find((r) => r.path === path);

export { getMatchingRoute, getExactRoute };
