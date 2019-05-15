require('superagent')
  .get('http://127.0.0.1:4040/api/tunnels')
  .end((e, r) => {
    if (e) {
      console.error('Real-time logs are disabled. Run `yarn ngrok` to enable tunneling of real time logs.');
      return;
    }
    if (r.body && r.body.tunnels) {
      for (var i = 0; i < r.body.tunnels.length; i++) {
        if (r.body.tunnels[i].proto === 'http') {
          return console.log(r.body.tunnels[i].public_url.replace('http://', ''));
        }
      }
    }
    console.error(
      'Real-time logs are disabled. Unable to determine ngrok tunnel url from ngrok configuration:',
      r.text
    );
  });
