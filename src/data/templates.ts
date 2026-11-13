import type { StatusTemplate, TemplateCategory } from '../types';

export const TEMPLATE_CATEGORIES: Array<'All' | TemplateCategory> = [
  'All',
  'Birthdays',
  'Holidays',
  'Greetings',
  'Family',
  'Work',
];

export const STATUS_TEMPLATES: StatusTemplate[] = [
  {
    id: 'tpl-bday-1',
    title: 'Warm Family Birthday Toast',
    category: 'Birthdays',
    message:
      'Happy Birthday! Grateful for another year of laughter, late-night calls, and unforgettable family memories. Wishing you joy and health ahead!',
    suggestedGroupNames: ['Family'],
    bgColorHex: '#0F766E',
    fontStyle: 'serif',
  },
  {
    id: 'tpl-bday-2',
    title: 'Close Friend Birthday Shoutout',
    category: 'Birthdays',
    message:
      'Happiest birthday to one of my favorite humans! Dinner and cake are on me this weekend — let us celebrate properly.',
    suggestedGroupNames: ['Close Friends'],
    bgColorHex: '#3730A3',
    fontStyle: 'sans',
  },
  {
    id: 'tpl-bday-3',
    title: 'Milestone Celebration Note',
    category: 'Birthdays',
    message:
      'Cheers to a huge milestone today! So proud of everything you have built this year — here is to the next chapter.',
    suggestedGroupNames: ['Close Friends', 'College Squad'],
    bgColorHex: '#581C87',
    fontStyle: 'sans',
  },
  {
    id: 'tpl-hol-1',
    title: 'Festive Season Wishes',
    category: 'Holidays',
    message:
      'Wishing everyone peace, warmth, and a table full of good food this holiday season. Hope you get to slow down and recharge with the people you love.',
    suggestedGroupNames: ['Family', 'Close Friends'],
    bgColorHex: '#9A3412',
    fontStyle: 'serif',
  },
  {
    id: 'tpl-hol-2',
    title: 'New Year Fresh Start',
    category: 'Holidays',
    message:
      'Happy New Year! Thank you for being part of my life over the past twelve months. Wishing you clarity, good health, and bright days ahead.',
    suggestedGroupNames: ['Family', 'Close Friends', 'Neighbors & Local'],
    bgColorHex: '#1E293B',
    fontStyle: 'sans',
  },
  {
    id: 'tpl-hol-3',
    title: 'Gratitude & Holiday Gathering',
    category: 'Holidays',
    message:
      'Feeling extra grateful today for family, loyal friends, and quiet moments together. Doors are open this evening if anyone wants to stop by for dessert!',
    suggestedGroupNames: ['Family', 'Neighbors & Local'],
    bgColorHex: '#166534',
    fontStyle: 'serif',
  },
  {
    id: 'tpl-grt-1',
    title: 'Good Morning Check-In',
    category: 'Greetings',
    message:
      'Good morning! Fresh coffee in hand and wishing everyone a calm, productive day ahead. Drop a message if you want to catch up later.',
    suggestedGroupNames: ['Close Friends'],
    bgColorHex: '#0F766E',
    fontStyle: 'sans',
  },
  {
    id: 'tpl-grt-2',
    title: 'Weekend Coffee & Catch-Up',
    category: 'Greetings',
    message:
      'Finally the weekend! Grabbing coffee downtown around 11 AM — message me if you are nearby and want to join.',
    suggestedGroupNames: ['Close Friends', 'College Squad'],
    bgColorHex: '#3730A3',
    fontStyle: 'sans',
  },
  {
    id: 'tpl-grt-3',
    title: 'Friday Wind-Down Greeting',
    category: 'Greetings',
    message:
      'Happy Friday! Wrapping up the week and stepping away from screens tonight. Hope everyone has a restful weekend.',
    suggestedGroupNames: ['Close Friends', 'Neighbors & Local'],
    bgColorHex: '#1E293B',
    fontStyle: 'sans',
  },
  {
    id: 'tpl-fam-1',
    title: 'Sunday Family Brunch',
    category: 'Family',
    message:
      'Sunday brunch at our place at 11:30 AM — bringing fresh croissants and masala chai. Let us know if you can make it!',
    suggestedGroupNames: ['Family'],
    bgColorHex: '#0F766E',
    fontStyle: 'sans',
  },
  {
    id: 'tpl-fam-2',
    title: 'Landed Safely Update',
    category: 'Family',
    message:
      'Just landed safely and heading home from the airport now! Will call everyone once unpacked.',
    suggestedGroupNames: ['Family'],
    bgColorHex: '#166534',
    fontStyle: 'sans',
  },
  {
    id: 'tpl-wrk-1',
    title: 'Out of Office Notice',
    category: 'Work',
    message:
      'Taking a few days offline to recharge. Reachable by email for anything urgent, otherwise back online Monday morning.',
    suggestedGroupNames: ['Work & Colleagues'],
    bgColorHex: '#1E293B',
    fontStyle: 'mono',
  },
  {
    id: 'tpl-wrk-2',
    title: 'Team Milestone Shipped',
    category: 'Work',
    message:
      'Big week wrapped up — our latest release just went live! Huge thank you to everyone who helped get it across the finish line.',
    suggestedGroupNames: ['Work & Colleagues'],
    bgColorHex: '#3730A3',
    fontStyle: 'sans',
  },
];
