import { describe, expect, it } from 'vitest';
import {
  buildOptions,
  isFinished,
  next,
  OPTION_COUNT,
  pick,
  RETRY_GAP,
  startSession,
  type Rng,
  type Word,
} from './quiz';

/** Deterministic RNG (mulberry32) so failures are reproducible. */
function seeded(seed = 42): Rng {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeWords(count: number, prefix = 'w'): Word[] {
  return Array.from({ length: count }, (_, i) => ({ en: `${prefix}${i}`, ru: `${prefix}-ru${i}` }));
}

const wrongOption = (options: string[], word: Word) => options.find((o) => o !== word.ru)!;

describe('buildOptions', () => {
  it('returns 8 unique options including the correct one', () => {
    const words = makeWords(20);
    const options = buildOptions(words[5], words, words, seeded());
    expect(options).toHaveLength(OPTION_COUNT);
    expect(new Set(options).size).toBe(OPTION_COUNT);
    expect(options).toContain(words[5].ru);
  });

  it('prefers the same topic and tops up from other topics', () => {
    const topic = makeWords(3, 't');
    const all = [...topic, ...makeWords(20, 'o')];
    const options = buildOptions(topic[0], topic, all, seeded());
    expect(options).toHaveLength(OPTION_COUNT);
    for (const word of topic) expect(options).toContain(word.ru);
  });

  it('never offers the correct translation twice', () => {
    const words = [...makeWords(10), { en: 'synonym', ru: 'w-ru0' }];
    const options = buildOptions(words[0], words, words, seeded());
    expect(options.filter((o) => o === 'w-ru0')).toHaveLength(1);
  });

  it('does not offer the other meaning of a word spelled the same', () => {
    const noun = { en: 'dress', ru: 'Платье', pos: 'n' };
    const verb = { en: 'dress', ru: 'Одеваться' };
    const words = [noun, verb, ...makeWords(10)];
    for (let seed = 1; seed <= 20; seed++) {
      expect(buildOptions(noun, words, words, seeded(seed))).not.toContain(verb.ru);
    }
  });

  it('does not offer a translation that is the same word with a note in brackets', () => {
    const artist = { en: 'artist', ru: 'Художник' };
    const painter = { en: 'painter', ru: 'Художник(красками)' };
    const words = [artist, painter, ...makeWords(10)];
    for (let seed = 1; seed <= 20; seed++) {
      expect(buildOptions(artist, words, words, seeded(seed))).not.toContain(painter.ru);
      expect(buildOptions(painter, words, words, seeded(seed))).not.toContain(artist.ru);
    }
  });

  it('offers translations told apart by different notes in brackets together', () => {
    const fit = { en: 'fit', ru: 'Подходить (по размеру)' };
    const suit = { en: 'suit', ru: 'Подходить (к лицу)' };
    const words = [fit, suit, ...makeWords(3)];
    expect(buildOptions(fit, words, words, seeded())).toContain(suit.ru);
  });

  describe('part of speech', () => {
    const tagged = (count: number, pos: string): Word[] =>
      makeWords(count, pos.replace(' ', '')).map((w) => ({ ...w, pos }));
    const nouns = tagged(6, 'n');
    const pluralNouns = tagged(6, 'pl n');
    const adjectives = tagged(12, 'adj');
    const verbs = tagged(3, 'v');
    const adverbs = tagged(3, 'adv');
    const phrases = makeWords(6, 'phrase');
    const all = [...nouns, ...pluralNouns, ...adjectives, ...verbs, ...adverbs, ...phrases];
    const translations = (list: Word[]) => list.map((w) => w.ru);

    it('gives a noun only nouns, plural nouns included', () => {
      const options = buildOptions(nouns[0], all, all, seeded());
      expect(options).toHaveLength(OPTION_COUNT);
      for (const o of options) expect(translations([...nouns, ...pluralNouns])).toContain(o);
    });

    it('gives an adjective only adjectives', () => {
      const options = buildOptions(adjectives[0], all, all, seeded());
      expect(options).toHaveLength(OPTION_COUNT);
      for (const o of options) expect(translations(adjectives)).toContain(o);
    });

    it('takes the same part of speech from other topics before giving fewer options', () => {
      const topic = [adjectives[0], ...nouns];
      expect(buildOptions(adjectives[0], topic, all, seeded())).toHaveLength(OPTION_COUNT);
      expect(buildOptions(verbs[0], all, all, seeded()).sort()).toEqual(translations(verbs).sort());
    });

    it('gives phrases and adverbs options from one shared group', () => {
      for (const word of [phrases[0], adverbs[0]]) {
        const options = buildOptions(word, all, all, seeded());
        expect(options).toHaveLength(OPTION_COUNT);
        for (const o of options) expect(translations([...phrases, ...adverbs])).toContain(o);
      }
    });
  });

  it('returns fewer options when there are not enough words', () => {
    const words = makeWords(4);
    expect(buildOptions(words[0], words, words, seeded())).toHaveLength(4);
  });
});

describe('session', () => {
  it('starts with every word queued and nothing learned', () => {
    const words = makeWords(10);
    const session = startSession(words, words, seeded());
    expect(session.queue).toHaveLength(10);
    expect(new Set(session.queue)).toEqual(new Set(words));
    expect(session).toMatchObject({ total: 10, learned: 0, mistakes: 0, picked: null });
    expect(session.options).toContain(session.queue[0].ru);
  });

  it('a correct answer increases the counter and removes the word', () => {
    const rng = seeded();
    const s0 = startSession(makeWords(10), [], rng);
    const word = s0.queue[0];
    const s1 = pick(s0, word.ru);
    expect(s1.learned).toBe(1);
    const s2 = next(s1, rng);
    expect(s2.queue).toHaveLength(9);
    expect(s2.queue).not.toContain(word);
    expect(s2.options).toContain(s2.queue[0].ru);
  });

  it('a wrong answer keeps the counter and brings the word back later', () => {
    const rng = seeded();
    const s0 = startSession(makeWords(10), [], rng);
    const word = s0.queue[0];
    const s1 = pick(s0, wrongOption(s0.options, word));
    expect(s1).toMatchObject({ learned: 0, mistakes: 1, missed: [word] });
    const s2 = next(s1, rng);
    expect(s2.queue).toHaveLength(10);
    expect(s2.queue.indexOf(word)).toBe(RETRY_GAP);
  });

  it('a missed word goes to the end when fewer cards than the gap remain', () => {
    const rng = seeded();
    const s0 = startSession(makeWords(2), [], rng);
    const word = s0.queue[0];
    const s1 = next(pick(s0, wrongOption(s0.options, word)), rng);
    expect(s1.queue).toEqual([s0.queue[1], word]);
  });

  it('the last word comes straight back after a mistake', () => {
    const rng = seeded();
    const s0 = startSession(makeWords(1), makeWords(10, 'o'), rng);
    const word = s0.queue[0];
    const s1 = next(pick(s0, wrongOption(s0.options, word)), rng);
    expect(s1.queue).toEqual([word]);
    expect(isFinished(s1)).toBe(false);
  });

  it('counts a word in `missed` once even after several mistakes', () => {
    const rng = seeded();
    let session = startSession(makeWords(1), makeWords(10, 'o'), rng);
    const word = session.queue[0];
    for (let i = 0; i < 3; i++) session = next(pick(session, wrongOption(session.options, word)), rng);
    expect(session.mistakes).toBe(3);
    expect(session.missed).toEqual([word]);
  });

  it('ignores a second answer on the same card', () => {
    const s0 = startSession(makeWords(10), [], seeded());
    const word = s0.queue[0];
    const s1 = pick(s0, wrongOption(s0.options, word));
    expect(pick(s1, word.ru)).toBe(s1);
  });

  it('finishes once every word is answered correctly, mistakes included', () => {
    const rng = seeded();
    let session = startSession(makeWords(10), [], rng);
    let steps = 0;
    while (!isFinished(session)) {
      const word = session.queue[0];
      // Miss every third card to make sure missed words are not lost.
      const answer = steps % 3 === 0 ? wrongOption(session.options, word) : word.ru;
      session = next(pick(session, answer), rng);
      steps++;
      expect(steps).toBeLessThan(100);
    }
    expect(session.learned).toBe(10);
    expect(session.mistakes).toBeGreaterThan(0);
  });
});
