// ------------------
// Internal Variables
// ------------------

let nextMessage = 0;
let nextInquiry = 3;
let nextCompany = 0;

// ------------------
// Internal Constants
// ------------------

const companies = ['sub-b503fb00e15248c6-1234', 'sub-b503fb00e15248c6-1235', 'sub-b503fb00e15248c6-1236'];

const admins: { [index: string]: IAdmin } = {};

const messages = [
  "I'd love to schedule a demo to see your product in action!",
  'How much does your service cost per month?',
  'I was told you folks are the best in the biz.',
  'Would really like to learn more. Email me back.',
  "What's the easiest way to do a POC with your service. Any guides?",
  'Do you offer enterprise support plans?',
  'Love the concept! Reach out to me so we can chat.',
];

const allInquiries: Inquiry[] = [
  { email: 'victoria.oliver@example.com' },
  { email: 'bessie.hernandez@example.com' },
  { email: 'aiden.prescott@example.com' },
  { email: 'shawn.olson@example.com' },
  { email: 'calvin.ellis@example.com' },
  { email: 'jeremy.dixon@example.com' },
  { email: 'isaiah.cooper@example.com' },
  { email: 'soham.brewer@example.com' },
  { email: 'francisco.castillo@example.com' },
  { email: 'heather.armstrong@example.com' },
  { email: 'juan.cook@example.com' },
  { email: 'darrell.moore@example.com' },
  { email: 'jill.soto@example.com' },
  { email: 'jean.murray@example.com' },
  { email: 'marjorie.palmer@example.com' },
  { email: 'debra.thomas@example.com' },
  { email: 'marion.horton@example.com' },
  { email: 'naomi.williamson@example.com' },
  { email: 'cameron.perez@example.com' },
  { email: 'doris.edwards@example.com' },
  { email: 'carla.hart@example.com' },
  { email: 'sean.wagner@example.com' },
  { email: 'rosa.howard@example.com' },
  { email: 'claudia.lawson@example.com' },
  { email: 'derek.nguyen@example.com' },
  { email: 'clayton.curtis@example.com' },
  { email: 'derek.lane@example.com' },
  { email: 'gwendolyn.kelly@example.com' },
  { email: 'leroy.alvarez@example.com' },
  { email: 'rafael.graves@example.com' },
  { email: 'ken.carroll@example.com' },
  { email: 'charlene.lee@example.com' },
  { email: 'tina.powell@example.com' },
  { email: 'tomothy.lopez@example.com' },
  { email: 'brayden.henderson@example.com' },
  { email: 'lorraine.lowe@example.com' },
  { email: 'candice.gardner@example.com' },
  { email: 'grace.rogers@example.com' },
  { email: 'eddie.mendoza@example.com' },
  { email: 'julia.nichols@example.com' },
  { email: 'tomothy.kelley@example.com' },
  { email: 'lance.wells@example.com' },
  { email: 'lydia.lee@example.com' },
  { email: 'john.clark@example.com' },
  { email: 'karl.shaw@example.com' },
  { email: 'wayne.simmmons@example.com' },
  { email: 'kyle.bradley@example.com' },
  { email: 'francis.soto@example.com' },
  { email: 'neil.holt@example.com' },
  { email: 'kelly.boyd@example.com' },
  { email: 'amanda.chambers@example.com' },
  { email: 'jeff.mason@example.com' },
  { email: 'philip.byrd@example.com' },
  { email: 'christine.garcia@example.com' },
  { email: 'kaylee.thompson@example.com' },
  { email: 'shawn.shaw@example.com' },
  { email: 'leslie.lane@example.com' },
  { email: 'sean.miles@example.com' },
  { email: 'camila.hart@example.com' },
  { email: 'corey.little@example.com' },
  { email: 'jeanne.owens@example.com' },
  { email: 'ricardo.reed@example.com' },
  { email: 'sofia.walker@example.com' },
  { email: 'marjorie.holmes@example.com' },
  { email: 'lucy.phillips@example.com' },
  { email: 'terry.wilson@example.com' },
  { email: 'sean.stanley@example.com' },
  { email: 'miriam.pena@example.com' },
  { email: 'greg.fisher@example.com' },
  { email: 'sonia.cruz@example.com' },
  { email: 'lawrence.vasquez@example.com' },
  { email: 'josephine.boyd@example.com' },
  { email: 'marilyn.montgomery@example.com' },
  { email: 'nicole.fisher@example.com' },
  { email: 'joseph.fowler@example.com' },
  { email: 'erika.williamson@example.com' },
  { email: 'brayden.richardson@example.com' },
  { email: 'bill.lane@example.com' },
  { email: 'floyd.burton@example.com' },
  { email: 'leslie.fletcher@example.com' },
  { email: 'debra.barnett@example.com' },
  { email: 'nora.ramirez@example.com' },
  { email: 'myrtle.watson@example.com' },
  { email: 'victor.fernandez@example.com' },
  { email: 'herbert.burton@example.com' },
  { email: 'robin.hicks@example.com' },
  { email: 'sofia.webb@example.com' },
  { email: 'brad.nelson@example.com' },
  { email: 'raul.larson@example.com' },
  { email: 'jesus.lambert@example.com' },
  { email: 'elaine.carpenter@example.com' },
  { email: 'pauline.pena@example.com' },
  { email: 'gene.kim@example.com' },
  { email: 'gerald.price@example.com' },
  { email: 'penny.gardner@example.com' },
  { email: 'debbie.terry@example.com' },
  { email: 'melvin.webb@example.com' },
  { email: 'allan.johnston@example.com' },
  { email: 'george.johnston@example.com' },
  { email: 'katrina.phillips@example.com' },
].map(({ email }) => {
  const message = messages[nextMessage++];
  if (nextMessage >= messages.length) {
    nextMessage = 0;
  }
  return { email, message, assignedTo: undefined };
});

// ------------------
// Internal Functions
// ------------------

function formatName(name: string) {
  return `${name[0].toUpperCase()}${name.substr(1)}`;
}

function formatFullName(name: any) {
  return `${formatName(name.first)} ${formatName(name.last)}`;
}

// ------------------
// Exported Constants
// ------------------

export const salesAgents: IAgent[] = [
  {
    id: 0,
    name: { title: 'mrs', first: 'kitty', last: 'andrews' },
    picture: 'https://randomuser.me/api/portraits/thumb/women/50.jpg',
    inquiries: [],
  },
  {
    id: 1,
    name: { title: 'mrs', first: 'felicia', last: 'harper' },
    picture: 'https://randomuser.me/api/portraits/thumb/women/47.jpg',
    inquiries: [],
  },
  {
    id: 2,
    name: { title: 'mr', first: 'micheal', last: 'larson' },
    picture: 'https://randomuser.me/api/portraits/thumb/men/97.jpg',
    inquiries: [],
  },
  {
    id: 3,
    name: { title: 'mr', first: 'ted', last: 'lowe' },
    picture: 'https://randomuser.me/api/portraits/thumb/men/88.jpg',
    inquiries: [],
  },
  {
    id: 4,
    name: { title: 'ms', first: 'heidi', last: 'vargas' },
    picture: 'https://randomuser.me/api/portraits/thumb/women/28.jpg',
    inquiries: [],
  },
  {
    id: 5,
    name: { title: 'miss', first: 'christine', last: 'johnston' },
    picture: 'https://randomuser.me/api/portraits/thumb/women/0.jpg',
    inquiries: [],
  },
  {
    id: 6,
    name: { title: 'ms', first: 'debbie', last: 'barnett' },
    picture: 'https://randomuser.me/api/portraits/thumb/women/35.jpg',
    inquiries: [],
  },
  {
    id: 7,
    name: { title: 'mrs', first: 'isobel', last: 'oliver' },
    picture: 'https://randomuser.me/api/portraits/thumb/women/74.jpg',
    inquiries: [],
  },
].map((agent: any) => {
  return {
    id: agent.id,
    name: formatFullName(agent.name),
    picture: agent.picture,
    inquiries: [],
  };
});

export const inquiries: Inquiry[] = [
  {
    email: 'gary.woods@example.com',
    message: "I'd love to schedule a demo to see your product in action!",
    assignedTo: salesAgents[2],
  },
  {
    email: 'leon.griffin@example.com',
    message: 'How much does your service cost per month?',
    assignedTo: salesAgents[0],
  },
  {
    email: 'kim.harrison@example.com',
    message: 'I was told you folks are the best in the biz.',
    assignedTo: undefined,
  },
];

// --------------
// Exported Types
// --------------

export interface Inquiry {
  email: string;
  message: string;
  assignedTo?: IAgent;
}

export interface IAgent {
  id: number;
  name: string;
  picture: string;
  inquiries: Array<Inquiry>;
}

export interface IAdmin {
  userId: string;
  company: string;
}

// ------------------
// Exported Functions
// ------------------

export function getNextInquiry(): Inquiry {
  const inquiry = allInquiries[nextInquiry++];
  if (nextInquiry > allInquiries.length) {
    nextInquiry = 0;
  }
  return inquiry;
}

export function getAdmin(userId: string) {
  if (!admins[userId]) {
    admins[userId] = { userId, company: companies[nextCompany] };
    nextCompany = (nextCompany + 1) % companies.length;
  }

  return admins[userId];
}
