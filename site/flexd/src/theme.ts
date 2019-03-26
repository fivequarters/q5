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

  // corporateName: {
  //   name: 'Josefin Sans',
  //   weight: 300,
  //   size: 20,
  //   type: 'sans-serif',
  //   color: colors.darkSecondary,
  // },
  // announcement: {
  //   name: 'Open Sans',
  //   weight: 300,
  //   size: 16,
  //   type: 'sans-serif',
  //   color: colors.lightPrimary,
  //   align: 'center',
  // },
  // link: {
  //   name: 'Open Sans',
  //   weight: 400,
  //   size: 13,
  //   type: 'sans-serif',
  //   align: 'center',
  //   color: colors.darkSecondary,
  // },
  // // splash: {
  // //   name: 'Josefin Sans',
  // //   weight: 300,
  // //   color: colors.accentPrimary,
  // //   size: 54,
  // //   align: 'center',
  // //   type: 'sans-serif',
  // // },
  // splashRevolving: {
  //   name: 'Josefin Sans',
  //   weight: 300,
  //   color: colors.darkSecondary,
  //   size: 54,
  //   align: 'center',
  //   type: 'sans-serif',
  // },
  // emailMessage: {
  //   name: 'Josefin Sans',
  //   weight: 300,
  //   size: 20,
  //   type: 'sans-serif',
  //   color: colors.lightPrimary,
  //   align: 'center',
  // },
  // emailInput: {
  //   name: 'Josefin Sans',
  //   weight: 300,
  //   size: 20,
  //   type: 'sans-serif',
  //   color: colors.lightPrimary,
  // },
  // emailSent: {
  //   name: 'Open Sans',
  //   weight: 400,
  //   size: 14,
  //   type: 'sans-serif',
  //   color: colors.accentSecondary,
  //   align: 'center',
  // },
  // section: {
  //   name: 'Josefin Sans',
  //   weight: 400,
  //   size: 30,
  //   align: 'center',
  //   type: 'sans-serif',
  //   color: colors.accentPrimary,
  //   variant: 'small-caps',
  // },
  // body: {
  //   name: 'Open Sans',
  //   weight: 400,
  //   size: 15,
  //   type: 'sans-serif',
  //   color: colors.darkPrimary,
  // },
  // bioName: {
  //   name: 'Josefin Sans',
  //   weight: 400,
  //   size: 20,
  //   color: colors.darkPrimary,
  //   type: 'sans-serif',
  //   align: 'center',
  //   variant: 'small-caps',
  // },
  // bioTitle: {
  //   name: 'Josefin Sans',
  //   weight: 400,
  //   size: 16,
  //   type: 'sans-serif',
  //   color: colors.accentPrimary,
  //   align: 'center',
  // },
  // footer: {
  //   name: 'Open Sans',
  //   weight: 300,
  //   size: 12,
  //   type: 'sans-serif',
  //   color: colors.lightPrimary,
  //   align: 'center',
  // },
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
          // fonts.emailInput,
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
          //fonts.emailSent,
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
      font: { ...fonts.h2, weight: 'bold' },
    },
    description: {
      font: { ...fonts.h3 },
    },
  },
  problem: {
    heading: {
      font: { ...fonts.h1, weight: 'bold' },
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
        // fonts.emailInput,
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
        //fonts.emailSent,
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
  navbar: {
    background: colors.lightPrimary,
    // announcement: {
    //   color: colors.lightPrimary,
    //   background: colors.accentPrimary,//colors.accentPrimary,
    //   font: fonts.announcement,
    // },
    corporateName: {
      font: {
        //fonts.corporateName,
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
        weight: 'bold',
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
        weight: 'bold',
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
        // fonts.emailInput,
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
        //fonts.emailSent,
        ...fonts.h2,
        color: colors.accentSecondary,
        align: 'center',
      },
    },
  },

  /// OLD

  loading: {
    logo: {
      color: colors.darkPrimary,
      size: 80,
      strokeWidth: 2,
      rate: 5,
    },
  },
  // section: {
  //   title: {
  //     font: fonts.section,
  //   },
  // },
  // aboutUs: {
  //   paragraph: {
  //     font: fonts.body,
  //   },
  // },
};

export const theme: any = {
  fonts,
  colors,
  components,
};
