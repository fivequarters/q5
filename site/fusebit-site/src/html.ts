const html:
  {
    [key: string]: {
      title: string,
      description: string,
      image?: string
    }
  } =
  {
    'default': {
      'title': 'Fusebit - the first integration platform designed for developer joy',
      'description': 'Quickly add integrations to your application using powerful and flexible API building blocks',
      'image': 'https://cdn.fusebit.io/twitter/twitter-orange.png',
    },
    '/about': {
      'title': 'Fusebit - About Us',
      'description': 'Meet the team behind Fusebit',
    },
    '/blog': {
      'title': 'The Fusebit Blog',
      'description': 'The latest news, technical articles and industry insights from the Fusebit team',
    },
    '/blog/2019/06/08/twilio-segment-github-serverless-extensibility': {
      'title': 'Is your SaaS Left Behind?',
      'description': 'Twilio, Segment, Github, and Auth0 are setting a new trend.',
      'image': 'https://cdn.fusebit.io/twitter/twitter-red.png',
    },
    '/blog/2019/06/27/schedule-requests-to-rate-limited-servers': {
      'title': 'Scheduling Requests with a Rate-Limited Server',
      'description': 'Have to make a lot of requests to a 3rd Party API? You\'ll need a solution for hadling server rate-limiting.',
      'image': 'https://cdn.fusebit.io/twitter/twitter-dark.png',
    },
    '/blog/2019/07/04/buy-then-build-and-integrate': {
      'title': 'Buy, Build and Integrate',
      'description': 'Are you ready for the new way companies use your SaaS?',
      'image': 'https://cdn.fusebit.io/twitter/twitter-orange.png',
    },
    '/blog/2019/08/19/integration-landscape': {
      'title': 'Did You Make the Right Call On Your Integration Story?',
      'description': 'Learn about the key factors to consider in deciding which integration platform to use.',
      'image': 'https://cdn.fusebit.io/twitter/twitter-cyan.png',
    },
    '/blog/2019/08/26/interview-with-eugenio-pace-auth0-ceo': {
      'title': 'The Role of Integrations in Building a Unicorn',
      'description': 'Interview with Eugenio Pace, Auth0 CEO',
      'image': 'https://cdn.fusebit.io/twitter/twitter-blog-interview-with-auth0-1.png',
    },
    '/blog/2019/09/06/interview-with-tyler-mills-zaius': {
      'title': 'The Evolution of Hyper-Personalized Marketing',
      'description': 'Interview with Tyler Mills, Product Manager at Zaius',
      'image': 'https://cdn.fusebit.io/twitter/twitter-blog-interview-with-zaius.png',
    },
    '/blog/2020/03/10/interview-with-scott-willeke-smartsheet-director-product': {
      'title': 'Premium Integrations as a Differentiator',
      'description': 'Interview with Scott Willeke, Director of Product at Smartsheet',
      'image': 'https://cdn.fusebit.io/twitter/twitter-blog-interview-with-smartsheet.png',
    },
  };

export default html;
