const namedColors = {
  pdfOrange: '#DA6028',
  pdfGreen: '#479788',
}

const colors = {
  darkPrimary: '#34495e',
  darkSecondary: '#283747',
  darkTertiary: '#85929E',
  lightPrimary: 'white',
  accentPrimary: '#fc4445',
  accentSecondary: '#abebc6',
  twitterLogo: '#00aced',
  linkedInLogo: '#4875B4',
};

const fonts = {
  corporateName: {
    name: 'Josefin Sans',
    weight: 300,
    size: 20,
    type: 'sans-serif',
    color: colors.darkSecondary,
  },
  announcement: {
    name: 'Open Sans',
    weight: 300,
    size: 16,
    type: 'sans-serif',
    color: colors.lightPrimary,
    align: 'center',
  },
  link: {
    name: 'Open Sans',
    weight: 400,
    size: 13,
    type: 'sans-serif',
    align: 'center',
    color: colors.darkSecondary,
  },
  splash: {
    name: 'Josefin Sans',
    weight: 300,
    color: colors.accentPrimary,
    size: 54,
    align: 'center',
    type: 'sans-serif',
  },
  splashRevolving: {
    name: 'Josefin Sans',
    weight: 300,
    color: colors.darkSecondary,
    size: 54,
    align: 'center',
    type: 'sans-serif',
  },
  emailMessage: {
    name: 'Josefin Sans',
    weight: 300,
    size: 20,
    type: 'sans-serif',
    color: colors.lightPrimary,
    align: 'center',
  },
  emailInput: {
    name: 'Josefin Sans',
    weight: 300,
    size: 20,
    type: 'sans-serif',
    color: colors.lightPrimary,
  },
  emailSent: {
    name: 'Open Sans',
    weight: 400,
    size: 14,
    type: 'sans-serif',
    color: colors.accentSecondary,
    align: 'center',
  },
  section: {
    name: 'Josefin Sans',
    weight: 400,
    size: 30,
    align: 'center',
    type: 'sans-serif',
    color: colors.accentPrimary,
    variant: 'small-caps',
  },
  body: {
    name: 'Open Sans',
    weight: 400,
    size: 15,
    type: 'sans-serif',
    color: colors.darkPrimary,
  },
  bioName: {
    name: 'Josefin Sans',
    weight: 400,
    size: 20,
    color: colors.darkPrimary,
    type: 'sans-serif',
    align: 'center',
    variant: 'small-caps',
  },
  bioTitle: {
    name: 'Josefin Sans',
    weight: 400,
    size: 16,
    type: 'sans-serif',
    color: colors.accentPrimary,
    align: 'center',
  },
  footer: {
    name: 'Open Sans',
    weight: 300,
    size: 12,
    type: 'sans-serif',
    color: colors.lightPrimary,
    align: 'center',
  },
};

const components = {
  loading: {
    logo: {
      color: colors.darkPrimary,
      size: 80,
      strokeWidth: 2,
      rate: 5,
    },
  },
  navbar: {
    background: colors.lightPrimary,
    announcement: {
      color: colors.lightPrimary,
      background: colors.accentPrimary,
      font: fonts.announcement,
    },
    corporateName: {
      font: fonts.corporateName,
    },
    logo: {
      size: 40,
      strokeWidth: 3,
      color: colors.darkPrimary,
    },
    link: {
      font: fonts.link,
      hover: colors.accentPrimary,
    },
    twitter: {
      size: 18,
      font: {
        color: colors.darkPrimary,
      },
      hover: colors.twitterLogo,
    },
  },
  section: {
    title: {
      font: fonts.section,
    },
  },
  splash: {
    title: {
      font: fonts.splash,
    },
    revolving: {
      font: fonts.splashRevolving,
    },
  },
  email: {
    background: colors.darkPrimary,
    message: {
      font: fonts.emailMessage,
    },
    input: {
      font: fonts.emailInput,
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
      font: fonts.emailSent,
    },
  },
  footer: {
    font: fonts.footer,
    background: colors.darkPrimary,
  },
  aboutUs: {
    paragraph: {
      font: fonts.body,
    },
  },
  bio: {
    name: { font: fonts.bioName },
    title: {
      font: fonts.bioTitle,
    },
    twitter: {
      font: {
        color: colors.darkPrimary,
      },
      hover: colors.twitterLogo,
    },
    linkedIn: {
      font: {
        color: colors.darkPrimary,
      },
      hover: colors.linkedInLogo,
    },
    description: {
      font: fonts.body,
    },
  },
};

export const theme: any = {
  fonts,
  colors,
  components,
};
