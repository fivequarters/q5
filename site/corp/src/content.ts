import RandallProfilePicture from '../assets/img/randall.png';
import TomekProfilePicture from '../assets/img/tomek.png';
import YavorProfilePicture from '../assets/img/yavor.png';

export const content = {
  announcement: "We're just getting started. Check back soon.",
  coporateName: 'Five\nQuarters',
  splash: {
    message: "We're Making SaaS Integrations",
    revolving: ['More Flexible', 'More Seamless', 'More Reliable', 'More Transparent', 'Just Work Better'],
  },
  corporateTwitter: 'https://twitter.com/fivequartersio',
  emailForm: {
    message: "We're furiously building our first product.\nWant us to keep you updated?",
    inputPlaceholder: 'Enter Your Email',
    emailSent: "Thanks, we'll keep you updated!",
  },
  aboutUs: [
    'Prior to co-founding Five Quarters, the team worked together for years on cloud technologies, platforms,',
    'and products across Microsoft and Auth0. The team is excited to bring their collective experience to',
    'collaborate again on bringing novel products to the market.',
  ].join(' '),
  bios: [
    {
      name: 'Tomasz Janczuk',
      title: 'Co-founder & CEO',
      picture: TomekProfilePicture,
      twitter: 'https://twitter.com/tjanczuk',
      linkedIn: 'https://www.linkedin.com/in/tjanczuk',
      description: [
        'Tomasz completed his MS in computer science and MBA before dedicating himself full time to',
        'software engineering. After more than a decade at Microsoft and Hewlett-Packard working on',
        'cloud platforms and frameworks, he joined Auth0 to incubate the webtask serverless technology.',
        'Prior to co-founding Five Quarters, he led a cross-functional team at Auth0 tasked with defining',
        'and delivering a new SaaS product to the market.',
      ].join(' '),
    },
    {
      name: 'Yavor Georgiev',
      title: 'Co-founder & Head of Product',
      picture: YavorProfilePicture,
      twitter: 'https://twitter.com/YavorGeorgiev',
      linkedIn: 'http://linkedin.com/in/yavorg',
      description: [
        'Yavor runs Product at Five Quarters, and spends his time talking to customers, designing features,',
        'and shepherding the product roadmap. Previously, he worked at Auth0, Hulu, and Microsoft, where he',
        'led some early efforts to enable serverless computing on Azure with a focus on mobile developers,',
        'and also worked on open-source frameworks that aim to make the cloud accessible from any platform.',
        'When not enjoying the beauty of the Pacific Northwest, you can usually find him on an ill-advised',
        '(mis)adventure in some remote destination.',
      ].join(' '),
    },
    {
      name: 'Randall Tombaugh',
      title: 'Co-founder & Head of Engineering',
      picture: RandallProfilePicture,
      linkedIn: 'https://www.linkedin.com/in/randall-tombaugh',
      description: [
        'Randall originally received his BS in Political Science and Philosophy before going back to school',
        'to get a second BS in Electrical Engineering. After a few years at Intel, Randall went to Microsoft,',
        'where he wrote software for for the .NET platform and then Azure. Prior to starting Five Quarters,',
        'he was managing a team of engineers at Auth0.',
      ].join(' '),
    },
  ],
  footer: '© Five Quarters LLC. - All rights reserved.',
};
