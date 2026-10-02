import type { Word } from '../quiz';

export interface Topic {
  /** "file-1" */
  id: string;
  /** "File 1" */
  title: string;
  words: Word[];
}

/** Part-of-speech labels the book puts after a word: "famous adj", "sandals pl n". */
const POS_SUFFIX = /\s+(pl n|phr v|n|v|adj|adv|prep|pron|conj|det)$/;

/**
 * Parses the word list copied from the spreadsheet: tab-separated rows of
 * "English<TAB>Russian<TAB>file N". Rows without a file number, like the header, are skipped.
 */
export function parseWordList(tsv: string): Topic[] {
  const files = new Map<number, Word[]>();

  for (const line of tsv.split(/\r?\n/)) {
    const [enCell = '', ru = '', fileCell = ''] = line.split('\t').map((cell) => cell.trim());
    const fileNo = Number(fileCell.match(/\d+/)?.[0]);
    if (!enCell || !ru || !fileNo) continue;

    const posMatch = enCell.match(POS_SUFFIX);
    const word: Word = posMatch
      ? { en: enCell.slice(0, posMatch.index), ru, pos: posMatch[1] }
      : { en: enCell, ru };

    if (!files.has(fileNo)) files.set(fileNo, []);
    files.get(fileNo)!.push(word);
  }

  return [...files]
    .sort(([a], [b]) => a - b)
    .map(([fileNo, words]) => ({ id: `file-${fileNo}`, title: `File ${fileNo}`, words }));
}
