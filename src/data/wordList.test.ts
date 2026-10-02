import { describe, expect, it } from 'vitest';
import { parseWordList } from './wordList';

const rows = (...lines: string[][]) => lines.map((cells) => cells.join('\t')).join('\n');

describe('parseWordList', () => {
  it('skips the header and splits the part of speech off the word', () => {
    const tsv = rows(
      ['Английский (WORDS)', 'Русский (ПЕРЕВОД)', 'Файл (FILE)'],
      ['famous adj', 'Известный', 'file 1'],
      ['sandals pl n', 'Сандали', 'file 1'],
      ['carry on phr v', 'Продолжать', 'file 1'],
      ['several det', 'Несколько', 'file 1'],
      ['get on well with', 'Ладить', 'file 1'],
      ['What does she look like?', 'Как она выглядит?', 'file 1'],
    );
    expect(parseWordList(tsv)).toEqual([
      {
        id: 'file-1',
        title: 'File 1',
        words: [
          { en: 'famous', ru: 'Известный', pos: 'adj' },
          { en: 'sandals', ru: 'Сандали', pos: 'pl n' },
          { en: 'carry on', ru: 'Продолжать', pos: 'phr v' },
          { en: 'several', ru: 'Несколько', pos: 'det' },
          { en: 'get on well with', ru: 'Ладить' },
          { en: 'What does she look like?', ru: 'Как она выглядит?' },
        ],
      },
    ]);
  });

  it('groups words by file and sorts files by number', () => {
    const tsv = rows(
      ['tie n', 'Галстук', 'file 10'],
      ['guy n', 'Парень', 'file 2'],
      ['vase n', 'Ваза', 'File 2'],
    );
    const topics = parseWordList(tsv);
    expect(topics.map((t) => t.title)).toEqual(['File 2', 'File 10']);
    expect(topics[0].words.map((w) => w.en)).toEqual(['guy', 'vase']);
  });

  it('handles Windows line endings, stray spaces and empty lines', () => {
    const tsv = 'scarf \t Шарф \tfile 1\r\n\r\n\t\t\r\ncoat n\tПальто\tfile 1\r\n';
    expect(parseWordList(tsv)[0].words).toEqual([
      { en: 'scarf', ru: 'Шарф' },
      { en: 'coat', ru: 'Пальто', pos: 'n' },
    ]);
  });

  it('does not mistake the end of a word for a part of speech', () => {
    const [topic] = parseWordList(rows(['nun', 'Монахиня', 'file 1'], ['T-shirt n', 'Футболка', 'file 1']));
    expect(topic.words).toEqual([
      { en: 'nun', ru: 'Монахиня' },
      { en: 'T-shirt', ru: 'Футболка', pos: 'n' },
    ]);
  });
});
