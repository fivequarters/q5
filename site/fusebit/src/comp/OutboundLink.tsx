import ReactGA from 'react-ga';

export function outboundLink(url: string, label?: string, target?: string) {
  ReactGA.outboundLink(
    {
      label: label || url,
    },
    function() {
      window.open(url, target);
    }
  );
}
