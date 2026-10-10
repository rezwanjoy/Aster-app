// Editable subject/topic presets (examples only: verify against the NCTB syllabus before real use).
import type { L10n } from '@/types';

export interface TopicPreset {
  key: string;
  name: L10n;
}
export interface SubjectPreset {
  key: string;
  name: L10n;
  level: string;
  topics: TopicPreset[];
}

export const SUBJECT_PRESETS: SubjectPreset[] = [
  {
    key: 'math',
    name: { en: 'Mathematics', bn: 'গণিত' },
    level: 'Class 10',
    topics: [
      { key: 'real', name: { en: 'Real Numbers', bn: 'বাস্তব সংখ্যা' } },
      { key: 'sets', name: { en: 'Sets & Functions', bn: 'সেট ও ফাংশন' } },
      { key: 'alg', name: { en: 'Algebraic Expressions', bn: 'বীজগাণিতিক রাশি' } },
      { key: 'exp', name: { en: 'Exponents & Logarithms', bn: 'সূচক ও লগারিদম' } },
      { key: 'quad', name: { en: 'Quadratic Equations', bn: 'দ্বিঘাত সমীকরণ' } },
      { key: 'sim', name: { en: 'Simultaneous Equations', bn: 'সহসমীকরণ' } },
      { key: 'tri', name: { en: 'Triangles & Angles', bn: 'ত্রিভুজ ও কোণ' } },
      { key: 'circ', name: { en: 'Circles', bn: 'বৃত্ত' } },
      { key: 'trig', name: { en: 'Trigonometry', bn: 'ত্রিকোণমিতি' } },
      { key: 'mens', name: { en: 'Mensuration', bn: 'পরিমিতি' } },
      { key: 'stat', name: { en: 'Statistics', bn: 'পরিসংখ্যান' } },
    ],
  },
  {
    key: 'phy',
    name: { en: 'Physics', bn: 'পদার্থবিজ্ঞান' },
    level: 'Class 9',
    topics: [
      { key: 'motion', name: { en: 'Motion', bn: 'গতি' } },
      { key: 'force', name: { en: 'Force', bn: 'বল' } },
      { key: 'work', name: { en: 'Work, Power & Energy', bn: 'কাজ, ক্ষমতা ও শক্তি' } },
      { key: 'heat', name: { en: 'Heat', bn: 'তাপ' } },
      { key: 'light', name: { en: 'Light', bn: 'আলো' } },
      { key: 'elec', name: { en: 'Electricity', bn: 'বিদ্যুৎ' } },
    ],
  },
  {
    key: 'eng',
    name: { en: 'English', bn: 'ইংরেজি' },
    level: 'Class 10',
    topics: [
      { key: 'tenses', name: { en: 'Tenses', bn: 'টেন্স' } },
      { key: 'articles', name: { en: 'Articles', bn: 'আর্টিকেল' } },
      { key: 'preps', name: { en: 'Prepositions', bn: 'প্রিপোজিশন' } },
      { key: 'voice', name: { en: 'Voice', bn: 'ভয়েস' } },
      { key: 'narr', name: { en: 'Narration', bn: 'নারেশন' } },
      { key: 'para', name: { en: 'Writing Paragraphs', bn: 'অনুচ্ছেদ লেখা' } },
    ],
  },
];

/** Fictional student names (English + Bangla). Phone numbers are clearly fake. */
export const NAMES = {
  math: [
    ['Rafi Ahmed', 'রাফি আহমেদ'],
    ['Nusrat Jahan', 'নুসরাত জাহান'],
    ['Farhana Islam', 'ফারহানা ইসলাম'],
    ['Maliha Akter', 'মালিহা আক্তার'],
    ['Tanvir Hasan', 'তানভীর হাসান'],
    ['Sabbir Khan', 'সাব্বির খান'],
    ['Tasnim Rahman', 'তাসনিম রহমান'],
    ['Imran Hossain', 'ইমরান হোসেন'],
    ['Sadia Sultana', 'সাদিয়া সুলতানা'],
    ['Arif Chowdhury', 'আরিফ চৌধুরী'],
    ['Mim Akter', 'মিম আক্তার'],
    ['Shakib Mahmud', 'শাকিব মাহমুদ'],
  ],
  phy: [
    ['Anika Tabassum', 'আনিকা তাবাসসুম'],
    ['Rakib Hasan', 'রাকিব হাসান'],
    ['Jannat Ara', 'জান্নাত আরা'],
    ['Fahim Reza', 'ফাহিম রেজা'],
    ['Lamia Haque', 'লামিয়া হক'],
    ['Mehedi Hasan', 'মেহেদী হাসান'],
    ['Sumaiya Khatun', 'সুমাইয়া খাতুন'],
    ['Nahid Alam', 'নাহিদ আলম'],
    ['Priya Das', 'প্রিয়া দাস'],
    ['Zubair Ahmed', 'জুবায়ের আহমেদ'],
  ],
  // English-only students (Rafi, Nusrat and Sabbir also join this batch from Math)
  eng: [
    ['Rubina Yasmin', 'রুবিনা ইয়াসমিন'],
    ['Kamrul Islam', 'কামরুল ইসলাম'],
    ['Tamanna Sharmin', 'তামান্না শারমিন'],
    ['Asif Iqbal', 'আসিফ ইকবাল'],
    ['Nabila Karim', 'নাবিলা করিম'],
  ],
} as const;

/** Weekdays with short names; id 0 = Sunday. */
export const WEEKDAYS: { id: number; en: string; bn: string }[] = [
  { id: 0, en: 'Sun', bn: 'রবি' },
  { id: 1, en: 'Mon', bn: 'সোম' },
  { id: 2, en: 'Tue', bn: 'মঙ্গল' },
  { id: 3, en: 'Wed', bn: 'বুধ' },
  { id: 4, en: 'Thu', bn: 'বৃহ' },
  { id: 5, en: 'Fri', bn: 'শুক্র' },
  { id: 6, en: 'Sat', bn: 'শনি' },
];
