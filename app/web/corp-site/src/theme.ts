const colors = {
  darkPrimary: '#34495e',
  darkSecondary: '#283747',
  lightPrimary: 'white',
  accentPrimary: '#fc4445',
  secondary: '',
};

const fonts = {
  corporateName: {
    name: 'Quicksand',
    weight: 400,
    size: 28,
    type: 'sans-serif',
    color: colors.darkSecondary,
    align: 'initial',
    variant: 'small-caps',
  },
  link: {
    name: 'Josefin Sans',
    weight: 400,
    type: 'sans-serif',
    align: 'center',
    color: colors.darkSecondary,
  },
  body: {
    name: 'Open Sans',
    weight: 400,
    size: 16,
    type: 'sans-serif',
    color: colors.darkPrimary,
    align: 'initial',
    variant: 'initial',
  },
  emailMessage: {
    name: 'Josefin Sans',
    weight: 300,
    size: 22,
    type: 'sans-serif',
    color: colors.lightPrimary,
    align: 'center',
    variant: 'initial',
  },
  emailInput: {
    name: 'Josefin Sans',
    weight: 300,
    size: 22,
    type: 'sans-serif',
    color: colors.lightPrimary,
    align: 'left',
    variant: 'initial',
  },
  footer: {
    name: 'Open Sans',
    weight: 300,
    size: 14,
    type: 'sans-serif',
    color: colors.lightPrimary,
    align: 'center',
    variant: 'initial',
  },
  splash1: {
    name: 'Josefin Sans',
    weight: 300,
    color: colors.accentPrimary,
    size: 60,
    align: 'center',
    type: 'sans-serif',
  },
  splash2: {
    name: 'Josefin Sans',
    weight: 300,
    color: colors.darkSecondary,
    size: 60,
    align: 'center',
    type: 'sans-serif',
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
  heading2: {
    name: 'Josefin Sans',
    weight: 400,
    size: 26,
    color: colors.darkPrimary,
    type: 'sans-serif',
    align: 'center',
    variant: 'small-caps',
  },
  heading3: {
    name: 'Josefin Sans',
    weight: 400,
    size: 18,
    type: 'sans-serif',
    color: colors.accentPrimary,
    align: 'center',
    variant: 'initial',
  },
};

// margin: 100px 15% 0px 15%;
// padding-top: 60px;
// max-width: 800px;
// border-top: 1px solid #d5d8dc;`,

// font-family: 'Josefin Sans', sans-serif;
// text-align: center;
// font-weight: 700;
// background-color: #fc4445;
// color: white;

const components = {
  navbar: {
    background: colors.lightPrimary,
    announcement: {
      color: colors.lightPrimary,
      background: colors.accentPrimary,
      font: fonts.footer,
    },
    corporateName: {
      font: fonts.corporateName,
    },
    logo: {
      color: colors.darkPrimary,
    },
    link: {
      font: fonts.link,
      hover: colors.accentPrimary,
    },
  },
  section: {
    title: {
      font: fonts.section,
    },
  },
  splash: {
    title1: {
      font: fonts.splash1,
    },
    title2: {
      font: fonts.splash2,
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
    name: { font: fonts.heading2 },
    title: {
      font: fonts.heading3,
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
