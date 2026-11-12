/**
 * A Bangla stopword list for search and text analysis: pronouns,
 * postpositions, conjunctions, common auxiliary verb forms, particles and
 * quantifiers. The list is normalized with `normalize()` when the module
 * loads, so lookups work whichever form of য় ড় ঢ় the input uses.
 */

import { normalize } from './normalize.js';

const RAW = `
অতএব অথচ অথবা অনুযায\u09BCী অনেক অনেকে অনেকেই অন্তত অন্য অন্যান্য অবধি অবশ্য অর্থাৎ আই আগামী আগে
আগেই আছে আছেন আজ আদ্যভাগে আপনার আপনি আপনারা আবার আমরা আমাকে আমাদের আমার আমি আর আরও ই
ইত্যাদি ইহা উচিত উত্তর উনি উপর উপরে এ এঁদের এঁরা এই একই একটি একটা একবার একে এখন এখনও
এখানে এখানেই এটা এটাই এটি এত এতটাই এতে এদের এবং এবার এমন এমনকী এমনি এর এরা এল এসে ঐ ও ওঁদের
ওঁর ওঁরা ওই ওকে ওখানে ওদের ওর ওরা কখনও কত কবে কয\u09BCেক কয\u09BCেকটি করছে করছেন করতে করবে করবেন করলে
করলেন করা করাই করায\u09BC করার করি করিতে করিয\u09BCা করিয\u09BCে করে করেই করেছিলেন করেছে করেছেন করেন কাউকে কাছ
কাছে কাজ কাজে কারও কারণ কি কিংবা কিছু কিছুই কিন্তু কী কে কেউ কেউই কেন কেমন কোথায\u09BC কোন কোনও কোনো
ক্ষেত্রে খুব গিয\u09BCে গিয\u09BCেছে গেছে গেল গেলে গোটা চলে ছাড\u09BCা ছাড\u09BCাও ছিল ছিলেন জন জনকে জনের জন্য
জানতে জানা জানানো জানায\u09BC জানিয\u09BCে জানিয\u09BCেছে টি ঠিক তখন তত তথা তবু তবে তা তাই তাও তাকে
তাতে তাদের তার তারপর তারা তাহলে তাহা তাঁকে তাঁদের তাঁর তাঁরা তাঁহারা তিনি তিনিও তুমি তুলে তেমন তো
তোমার থাকবে থাকবেন থাকা থাকায\u09BC থাকে থাকেন থেকে থেকেই থেকেও দিকে দিতে দিন দিয\u09BCে দিয\u09BCেছে দিয\u09BCেছেন দিলেন
দু দুই দুটি দুটো দেওয\u09BCা দেওয\u09BCার দেখতে দেখা দেখে দেন দেয\u09BC দ্বারা ধরা ধরে না নাই নাগাদ নানা নিজে নিজেই
নিজেদের নিজের নিতে নিয\u09BCে নেই নেওয\u09BCা নেওয\u09BCার নয\u09BC নাকি পক্ষে পর পরে পরেই পরেও পর্যন্ত পাওয\u09BCা পারি
পারে পারেন পেয\u09BCে প্রতি প্রথম প্রভৃতি প্রায\u09BC ফলে ফের বক্তব্য বদলে বরং বলতে বলল বললেন বলা বলে বলেছেন
বলেন বসে বহু বা বাদে বার বিনা বিভিন্ন বিশেষ বিষয\u09BCটি বেশ বেশি ব্যবহার ব্যাপারে ভাবে ভাবেই মতো মতোই
মত মধ্যভাগে মধ্যে মধ্যেই মধ্যেও মনে মাত্র মাধ্যমে মোট মোটেই যখন যত যতটা যথেষ্ট যদি যদিও যা যাঁর যাঁরা
যাওয\u09BCা যাওয\u09BCার যাকে যাচ্ছে যাতে যাদের যান যাবে যায\u09BC যার যারা যিনি যে যেখানে যেতে যেন যেমন র রকম রয\u09BCেছে
রাখা রেখে লক্ষ শুধু শুরু সঙ্গে সঙ্গেও সব সবার সমস্ত সম্প্রতি সহ সহিত সাধারণ সামনে সুতরাং সে সেই সেখান
সেখানে সেটা সেটাই সেটাও সেটি স্পষ্ট স্বয\u09BCং হইতে হইবে হইয\u09BCা হওয\u09BCা হওয\u09BCায\u09BC হওয\u09BCার হচ্ছে হত হতে হতেই হন হবে
হবেন হয\u09BC হয\u09BCতো হয\u09BCনি হয\u09BCে হয\u09BCেই হয\u09BCেছিল হয\u09BCেছে হয\u09BCেছেন হল হলে হলেই হলেও হলো হাজার হিসাবে হৈলে হোক
`;

export const STOPWORDS: ReadonlySet<string> = new Set(
  RAW.split(/\s+/)
    .filter((w) => w.length > 0)
    .map((w) => normalize(w)),
);

/** True when `word` (in any normalization form) is a stopword. */
export function isStopword(word: string, extra?: ReadonlySet<string>): boolean {
  const w = normalize(word.trim());
  return STOPWORDS.has(w) || (extra?.has(w) ?? false);
}

/** Removes stopwords from a list of words. */
export function removeStopwords(words: readonly string[], extra?: Iterable<string>): string[] {
  const more = extra ? new Set(Array.from(extra, (w) => normalize(w))) : undefined;
  return words.filter((w) => !isStopword(w, more));
}
