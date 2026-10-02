import { Header } from '../components/Header';
import { topics } from '../data/vocabulary';
import { plural } from '../format';

interface Props {
  onOpenVocabulary: () => void;
}

const comingSoon = ['Prepositions', 'Phrasal verbs', 'Verbs + prepositions'];

export function Home({ onOpenVocabulary }: Props) {
  return (
    <div className="app">
      <Header title="English Trainer" />
      <ul className="list">
        <li className="list__item">
          <button className="row" onClick={onOpenVocabulary}>
            <span className="row__title">Vocabulary</span>
            <span className="row__aside">
              {topics.length} {plural(topics.length, ['файл', 'файла', 'файлов'])} ›
            </span>
          </button>
        </li>
        {comingSoon.map((title) => (
          <li key={title} className="list__item">
            <button className="row" disabled>
              <span className="row__title">{title}</span>
              <span className="row__aside">скоро</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
