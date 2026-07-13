export type LectureStatus = 'live' | 'scheduled' | 'ended';

export type LectureRole = 'Host' | 'Panelist' | 'Commentator' | 'Student';

export type LectureParticipant = {
  name: string;
  role: LectureRole;
  affiliation: string;
  speaking: boolean;
};

export type LectureComment = {
  author: string;
  role: 'Scientist' | 'Professor' | 'Student';
  message: string;
  time: string;
};

export type Lecture = {
  id: string;
  title: string;
  presenter: string;
  presenterRole: string;
  topic: string;
  status: LectureStatus;
  attendees: number;
  maxAttendees: number;
  scheduledAt: string | null;
  description: string;
  tags: string[];
  speakersAllowed: number;
  format: string;
  hall: string;
  studentMode: string;
  speakingQueue: string[];
  participants: LectureParticipant[];
  comments: LectureComment[];
};

export const lectures: Lecture[] = [
  {
    id: 'quantum-cryptography',
    title: 'Quantum Entanglement and the Future of Cryptography',
    presenter: 'Dr. Richard Feynman Jr.',
    presenterRole: 'Professor, MIT',
    topic: 'Quantum Physics',
    status: 'live',
    attendees: 234,
    maxAttendees: 500,
    scheduledAt: null,
    description:
      'A rigorous lecture on entanglement, Bell inequalities, and the security assumptions behind post-quantum communication.',
    tags: ['Quantum', 'Cryptography', 'Physics'],
    speakersAllowed: 5,
    format: 'Moderated live hall',
    hall: 'Royal Society style amphitheatre',
    studentMode: 'Students attend silently unless invited to speak by the presenter.',
    speakingQueue: ['Aarav Sharma', 'Meera Iyer', 'Jonas Keller'],
    participants: [
      { name: 'Dr. Richard Feynman Jr.', role: 'Host', affiliation: 'MIT', speaking: true },
      { name: 'Prof. Elena Marquez', role: 'Panelist', affiliation: 'CERN Theory Group', speaking: true },
      { name: 'Dr. Naomi Clarke', role: 'Commentator', affiliation: 'Oxford Quantum Institute', speaking: false },
      { name: 'Aarav Sharma', role: 'Student', affiliation: 'IISc Bangalore', speaking: false },
      { name: 'Meera Iyer', role: 'Student', affiliation: 'University of Delhi', speaking: false },
      { name: 'Jonas Keller', role: 'Student', affiliation: 'ETH Zurich', speaking: false },
    ],
    comments: [
      {
        author: 'Prof. Elena Marquez',
        role: 'Professor',
        message: 'The distinction between correlation and usable signal should be emphasized before the Q&A.',
        time: '10:14',
      },
      {
        author: 'Dr. Naomi Clarke',
        role: 'Scientist',
        message: 'Recent satellite experiments make this section especially relevant for long-distance keys.',
        time: '10:18',
      },
      {
        author: 'Riya Sen',
        role: 'Student',
        message: 'Requesting permission to ask about no-cloning and practical key distribution.',
        time: '10:20',
      },
    ],
  },
  {
    id: 'crispr-ethics',
    title: 'CRISPR-Cas9: Gene Editing and Ethical Boundaries',
    presenter: 'Prof. Jennifer Doudna-Smith',
    presenterRole: 'Nobel Laureate, UC Berkeley',
    topic: 'Molecular Biology',
    status: 'live',
    attendees: 412,
    maxAttendees: 1000,
    scheduledAt: null,
    description:
      'A landmark session on gene editing mechanisms, clinical applications, and the ethical limits of inherited modification.',
    tags: ['CRISPR', 'Genetics', 'Bioethics'],
    speakersAllowed: 3,
    format: 'Invite-only microphone panel',
    hall: 'Classical medical academy',
    studentMode: 'Students can attend, react, and request the floor.',
    speakingQueue: ['Nora Patel', 'Kenji Sato'],
    participants: [
      { name: 'Prof. Jennifer Doudna-Smith', role: 'Host', affiliation: 'UC Berkeley', speaking: true },
      { name: 'Dr. Luis Moreno', role: 'Panelist', affiliation: 'Broad Institute', speaking: true },
      { name: 'Nora Patel', role: 'Student', affiliation: 'Cambridge', speaking: false },
      { name: 'Kenji Sato', role: 'Student', affiliation: 'Tokyo University', speaking: false },
    ],
    comments: [
      {
        author: 'Dr. Luis Moreno',
        role: 'Scientist',
        message: 'The off-target editing examples are a useful bridge into consent and regulation.',
        time: '09:42',
      },
      {
        author: 'Prof. Amara Ndlovu',
        role: 'Professor',
        message: 'Please reserve five minutes for therapeutic versus enhancement boundaries.',
        time: '09:47',
      },
    ],
  },
  {
    id: 'standard-model',
    title: 'The Standard Model: Gaps, Anomalies and Beyond',
    presenter: 'Dr. Lisa Randall',
    presenterRole: 'Professor, Harvard University',
    topic: 'Particle Physics',
    status: 'scheduled',
    attendees: 0,
    maxAttendees: 800,
    scheduledAt: '2026-07-01T15:00:00Z',
    description:
      'Examining known anomalies in the Standard Model and theoretical frameworks that could extend particle physics.',
    tags: ['Particle Physics', 'Standard Model', 'Theory'],
    speakersAllowed: 4,
    format: 'Scheduled lecture hall',
    hall: 'Institute auditorium',
    studentMode: 'Students may register and submit questions before the room opens.',
    speakingQueue: [],
    participants: [
      { name: 'Dr. Lisa Randall', role: 'Host', affiliation: 'Harvard University', speaking: false },
      { name: 'Prof. Matteo Ricci', role: 'Panelist', affiliation: 'INFN', speaking: false },
    ],
    comments: [
      {
        author: 'Prof. Matteo Ricci',
        role: 'Professor',
        message: 'Muon g-2 and flavor anomalies should be placed after the symmetry review.',
        time: 'Draft',
      },
    ],
  },
  {
    id: 'ai-drug-discovery',
    title: 'Deep Learning in Drug Discovery: From AlphaFold to Clinical Trials',
    presenter: 'Prof. Andrew Ng',
    presenterRole: 'Stanford University',
    topic: 'AI & Medicine',
    status: 'scheduled',
    attendees: 0,
    maxAttendees: 600,
    scheduledAt: '2026-07-02T10:00:00Z',
    description:
      'How protein prediction and generative models are changing pharmaceutical research and trial design.',
    tags: ['AI', 'Drug Discovery', 'Machine Learning'],
    speakersAllowed: 6,
    format: 'Research practicum',
    hall: 'Computational medicine theatre',
    studentMode: 'Students attend live and can be promoted for supervised questions.',
    speakingQueue: [],
    participants: [
      { name: 'Prof. Andrew Ng', role: 'Host', affiliation: 'Stanford University', speaking: false },
      { name: 'Dr. Imani Brooks', role: 'Commentator', affiliation: 'DeepMind Science', speaking: false },
    ],
    comments: [
      {
        author: 'Dr. Imani Brooks',
        role: 'Scientist',
        message: 'Include a practical checkpoint on model validation and wet-lab feedback.',
        time: 'Draft',
      },
    ],
  },
  {
    id: 'black-hole-information',
    title: 'Black Holes, Information Paradox and Hawking Radiation',
    presenter: 'Dr. Kip Thorne',
    presenterRole: 'Caltech, Nobel Laureate',
    topic: 'Astrophysics',
    status: 'ended',
    attendees: 1847,
    maxAttendees: 2000,
    scheduledAt: null,
    description:
      'A comprehensive lecture on black hole thermodynamics, information loss, and modern holographic interpretations.',
    tags: ['Black Holes', 'Astrophysics', 'Cosmology'],
    speakersAllowed: 2,
    format: 'Recorded symposium',
    hall: 'Grand observatory hall',
    studentMode: 'Students can watch the replay and comment on annotated timestamps.',
    speakingQueue: [],
    participants: [
      { name: 'Dr. Kip Thorne', role: 'Host', affiliation: 'Caltech', speaking: false },
      { name: 'Prof. Aisha Rahman', role: 'Panelist', affiliation: 'Perimeter Institute', speaking: false },
    ],
    comments: [
      {
        author: 'Prof. Aisha Rahman',
        role: 'Professor',
        message: 'The replay marker at 31:20 is the best entry point for entropy arguments.',
        time: 'Replay',
      },
    ],
  },
];

export function getLectureById(id: string) {
  return lectures.find((lecture) => lecture.id === id);
}
