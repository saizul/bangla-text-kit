// Run after `npm run build`:  node examples/calendar.mjs [YYYY-MM-DD]
import { formatBanglaDate, fromBanglaDate, parseBanglaDate, toBanglaDate } from 'bangla-text-kit';

// Default to today's date in Bangladesh, whatever the server's time zone is.
const input = process.argv[2] ?? new Date();
const options = { timeZone: 'Asia/Dhaka' };

const date = toBanglaDate(input, options);
console.log('বঙ্গাব্দ         ', formatBanglaDate(input, { ...options, pattern: 'EEEE, d MMMM y বঙ্গাব্দ' }));
console.log('ঋতু             ', date.seasonName);
console.log('Gregorian (bn)  ', formatBanglaDate(input, { ...options, calendar: 'gregorian' }));
console.log('Day of the year ', date.dayOfYear);

const nextNewYear = fromBanglaDate({ year: date.year + 1, month: 1, day: 1 });
console.log('Next পহেলা বৈশাখ', `${nextNewYear.year}-${nextNewYear.month}-${nextNewYear.day}`);

const parsed = parseBanglaDate('২১শে ফাল্গুন ১৪৩২');
console.log('Parsed          ', parsed, '->', parsed && fromBanglaDate(parsed));
