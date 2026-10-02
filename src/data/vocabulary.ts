import type { Word } from '../quiz';
import wordsTsv from './words.tsv?raw';
import { parseWordList, type Topic } from './wordList';

export type { Topic };

// words.tsv is the spreadsheet pasted as is: a new "file N" in it becomes a new topic.
export const topics: Topic[] = parseWordList(wordsTsv);

export const allWords: Word[] = topics.flatMap((topic) => topic.words);
