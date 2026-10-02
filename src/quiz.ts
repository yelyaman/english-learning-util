export interface Word {
  en: string;
  ru: string;
  /** Part of speech as the book labels it: "n", "adj", "pl n"... */
  pos?: string;
}

export type Rng = () => number;

export const OPTION_COUNT = 8;
/** How many other cards are shown before a missed word comes back. */
export const RETRY_GAP = 3;

export interface Session {
  /** Words still to answer; queue[0] is the current card. */
  queue: Word[];
  total: number;
  learned: number;
  mistakes: number;
  /** Words answered wrong at least once, in order of the first mistake. */
  missed: Word[];
  /** Answer options for the current card. */
  options: string[];
  /** Option chosen for the current card, or null while waiting for an answer. */
  picked: string | null;
  /** Words of the topic: wrong options are taken from here first. */
  words: readonly Word[];
  /** Words of all topics: used for wrong options when the topic is too small. */
  fallback: readonly Word[];
}

export function shuffle<T>(items: readonly T[], rng: Rng = Math.random): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

interface Meaning {
  base: string;
  note: string;
}

function meaningOf(ru: string): Meaning {
  const lower = ru.toLowerCase();
  return {
    base: lower.replace(/\(.*?\)/g, '').trim(),
    note: [...lower.matchAll(/\((.*?)\)/g)].map((m) => m[1].trim()).join('|'),
  };
}

/**
 * Two translations that differ only in a note in brackets both fit the word when one of them
 * has no note: "Художник" and "Художник(красками)". Different notes are the very distinction
 * to learn, so those may be shown together: "Подходить (по размеру)" / "Подходить (к лицу)".
 */
function sameMeaning(a: Meaning, b: Meaning): boolean {
  return a.base === b.base && (!a.note || !b.note || a.note === b.note);
}

/**
 * Nouns, adjectives and verbs get options only of their own kind ("trousers pl n" is a noun).
 * Everything else - phrases without a label, and adverbs, which are too few for a group of
 * their own - shares one group.
 */
const POS_GROUP: Record<string, string> = { n: 'n', 'pl n': 'n', adj: 'adj', v: 'v', 'phr v': 'v' };

function posGroup(word: Word): string {
  return (word.pos && POS_GROUP[word.pos]) || 'other';
}

/**
 * The correct translation plus wrong ones from the same topic, topped up from other topics.
 * Wrong options are from the same group as the word ("ring" n gets only nouns), so it
 * cannot be guessed by grammar.
 * There are fewer than OPTION_COUNT options when the group has too few words.
 * A wrong option never has the same meaning as another option, and never belongs to a word
 * spelled the same ("dress" n / "dress" v), so exactly one option is right.
 */
export function buildOptions(
  word: Word,
  words: readonly Word[],
  fallback: readonly Word[],
  rng: Rng = Math.random,
): string[] {
  const options = [word.ru];
  const meanings = [meaningOf(word.ru)];
  const spelling = word.en.toLowerCase();
  const group = posGroup(word);
  for (const candidate of [...shuffle(words, rng), ...shuffle(fallback, rng)]) {
    if (options.length === OPTION_COUNT) break;
    if (posGroup(candidate) !== group || candidate.en.toLowerCase() === spelling) continue;
    const meaning = meaningOf(candidate.ru);
    if (meanings.some((taken) => sameMeaning(taken, meaning))) continue;
    meanings.push(meaning);
    options.push(candidate.ru);
  }
  return shuffle(options, rng);
}

export function startSession(
  words: readonly Word[],
  fallback: readonly Word[],
  rng: Rng = Math.random,
): Session {
  const queue = shuffle(words, rng);
  return {
    queue,
    total: queue.length,
    learned: 0,
    mistakes: 0,
    missed: [],
    options: queue.length ? buildOptions(queue[0], words, fallback, rng) : [],
    picked: null,
    words,
    fallback,
  };
}

/** Records the answer for the current card. The card stays on screen until `next`. */
export function pick(session: Session, option: string): Session {
  if (session.picked !== null || session.queue.length === 0) return session;
  const word = session.queue[0];
  if (option === word.ru) {
    return { ...session, picked: option, learned: session.learned + 1 };
  }
  return {
    ...session,
    picked: option,
    mistakes: session.mistakes + 1,
    missed: session.missed.includes(word) ? session.missed : [...session.missed, word],
  };
}

/** Moves on after an answer: a learned word leaves the queue, a missed one comes back RETRY_GAP cards later. */
export function next(session: Session, rng: Rng = Math.random): Session {
  if (session.picked === null) return session;
  const [word, ...rest] = session.queue;
  const queue =
    session.picked === word.ru
      ? rest
      : [...rest.slice(0, RETRY_GAP), word, ...rest.slice(RETRY_GAP)];
  return {
    ...session,
    queue,
    picked: null,
    options: queue.length ? buildOptions(queue[0], session.words, session.fallback, rng) : [],
  };
}

export function isFinished(session: Session): boolean {
  return session.queue.length === 0;
}
