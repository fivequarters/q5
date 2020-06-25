import { useHistory } from 'react-router-dom';

type JSONable = any;

type SetHistory = (data: JSONable) => void;

const hashHistoryToObj = (hash: string): JSONable => {
  let obj: { [key: string]: string | object } = {};
  if (hash.length > 0) {
    hash
      .substring(1) // Strip out the leading '#'.
      .split('&')
      .forEach((e) => {
        const [k, v] = e.split('=');
        if (k !== undefined && k.length > 0 && v !== undefined) {
          try {
            obj[k] = JSON.parse(decodeURIComponent(v));
          } catch (e) {
            obj[k] = decodeURIComponent(v);
          }
        }
      });
    return obj;
  }

  return {};
};

const objToHashHistory = (obj: JSONable): string => {
  let query: any = { ...obj }; // Make a copy

  delete query.count;

  // Convert to a string
  const hash =
    '#' +
    Object.keys(query)
      .reduce<string[]>((a: string[], k: string) => {
        if (query[k] == null) {
          a.push(`${k}`);
        } else {
          if (query[k] !== undefined) {
            a.push(`${k}=${encodeURIComponent(JSON.stringify(query[k]))}`);
          }
        }
        return a;
      }, [])
      .join('&');
  return hash;
};

// Returns the current history for 'key' and a function to be used to update that component of the history.
const useHashHistory = (key: string, defaultValue: JSONable = {}): [JSONable, SetHistory] => {
  const history = useHistory();

  let cur = hashHistoryToObj(history.location.hash)[key] || defaultValue;

  return [
    cur,
    (data: JSONable): void => {
      let hash = hashHistoryToObj(history.location.hash);
      hash[key] = data;
      history.replace(objToHashHistory(hash));
    },
  ];
};

export { useHashHistory };
