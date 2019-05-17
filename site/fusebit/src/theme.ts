const colors = {
  darkPrimary: '#34495e',
  darkSecondary: '#283747',
  darkTertiary: '#85929E',
  lightPrimary: 'white',
  lightSecondary: '#eaedee',
  accentPrimary: '#DA6028',
  accentSecondary: '#479788',
  twitterLogo: '#00aced',
  linkedInLogo: '#4875B4',
};

const fonts = {
  splash: {
    name: 'Raleway',
    weight: 300,
    color: colors.darkPrimary,
    size: 54,
    type: 'sans-serif',
  },
  h1: {
    name: 'Raleway',
    weight: 300,
    color: colors.darkPrimary,
    size: 36,
    type: 'sans-serif',
    media: {
      '500px': {
        size: 24,
      },
    },
  },
  h2: {
    name: 'Raleway',
    weight: 300,
    color: colors.darkPrimary,
    size: 24,
    type: 'sans-serif',
  },
  h3: {
    name: 'Lato',
    weight: 300,
    color: colors.darkPrimary,
    size: 20,
    type: 'sans-serif',
  },
};

const components = {
  splash: {
    background: colors.lightSecondary,
    mainMessage: {
      font: {
        ...fonts.splash,
        color: colors.accentPrimary,
      },
    },
    subMessage: {
      font: {
        ...fonts.h3,
      },
    },
    cta: {
      background: colors.accentPrimary,
      message: {
        font: { ...fonts.h3, color: colors.lightPrimary },
      },
      input: {
        font: {
          ...fonts.h3,
          color: colors.lightPrimary,
        },
        background: 'transparent',
        placeholder: colors.lightSecondary,
      },
      button: {
        font: {
          size: 30,
          color: colors.lightSecondary,
        },
        enabled: colors.lightPrimary,
        enabledHover: colors.lightPrimary,
      },
      sent: {
        font: {
          ...fonts.h3,
          color: colors.lightPrimary,
          align: 'center',
        },
      },
    },
  },
  feature: {
    background: colors.accentSecondary,
    heading: {
      font: {
        ...fonts.h1,
        color: colors.lightPrimary,
      },
    },
    title: {
      font: {
        ...fonts.h3,
        weight: 'bold',
        color: colors.lightPrimary,
      },
    },
    description: {
      font: {
        ...fonts.h3,
        color: colors.lightPrimary,
      },
    },
  },
  vp: {
    title: {
      font: { ...fonts.h2 },
    },
    description: {
      font: { ...fonts.h3 },
    },
  },
  problem: {
    heading: {
      font: { ...fonts.h1 },
    },
    title: {
      font: { ...fonts.h2 },
    },
    description: {
      font: { ...fonts.h3 },
    },
  },
  footerCta: {
    background: colors.lightSecondary,
    message: {
      font: { ...fonts.h3, color: colors.darkPrimary },
    },
    input: {
      font: {
        ...fonts.h3,
        color: colors.darkPrimary,
      },
      background: 'transparent',
      placeholder: colors.accentSecondary,
    },
    button: {
      font: {
        size: 30,
        color: colors.accentSecondary,
      },
      enabled: colors.darkPrimary,
      enabledHover: colors.darkPrimary,
    },
    sent: {
      font: {
        ...fonts.h3,
        color: colors.darkPrimary,
        align: 'center',
      },
    },
  },
  footer: {
    font: {
      ...fonts.h3,
      align: 'center',
    },
    link: {
      font: {
        ...fonts.h3,
      },
      hover: colors.accentSecondary,
    },
  },
  legal: {
    background: colors.lightSecondary,
    heading: {
      font: {
        ...fonts.h1,
      },
    },
    body: {
      font: {
        ...fonts.h3,
      },
    },
  },
  support: {
    background: colors.lightSecondary,
    heading: {
      font: {
        ...fonts.h1,
      },
    },
    body: {
      font: {
        ...fonts.h3,
      },
    },
  },
  navbar: {
    background: colors.lightPrimary,
    corporateName: {
      font: {
        ...fonts.h1,
      },
    },
    logo: {
      size: 40,
      strokeWidth: 3,
      color: colors.darkPrimary,
    },
    link: {
      font: {
        ...fonts.h3,
      },
      hover: colors.accentSecondary,
    },
    twitter: {
      font: {
        color: colors.darkPrimary,
        size: 25,
      },
      hover: colors.twitterLogo,
    },
  },
  bio: {
    heading: {
      font: {
        ...fonts.h1,
      },
    },
    intro: {
      font: {
        ...fonts.h3,
      },
    },
    name: {
      font: {
        ...fonts.h2,
        align: 'center',
      },
    },
    title: {
      font: {
        ...fonts.h3,
        color: colors.accentPrimary,
        align: 'center',
      },
    },
    twitter: {
      font: {
        color: colors.darkPrimary,
        size: 20,
      },
      hover: colors.twitterLogo,
    },
    linkedIn: {
      font: {
        color: colors.darkPrimary,
        size: 25,
      },
      hover: colors.linkedInLogo,
    },
    description: {
      font: {
        ...fonts.h3,
      },
    },
  },
  email: {
    background: colors.darkPrimary,
    message: {
      font: {
        //fonts.emailMessage,
        ...fonts.h2,
        color: colors.lightPrimary,
        align: 'center',
      },
    },
    input: {
      font: {
        ...fonts.h2,
        color: colors.lightPrimary,
      },
      background: 'transparent',
      placeholder: colors.accentSecondary,
    },
    button: {
      font: {
        size: 30,
        color: colors.darkTertiary,
      },
      enabled: colors.lightPrimary,
      enabledHover: colors.accentSecondary,
    },
    sent: {
      font: {
        ...fonts.h2,
        color: colors.accentSecondary,
        align: 'center',
      },
    },
  },

  loading: {
    logo: {
      color: colors.darkPrimary,
      size: 80,
      strokeWidth: 2,
      rate: 5,
    },
  },
};

export const theme: any = {
  fonts,
  colors,
  components,
};
