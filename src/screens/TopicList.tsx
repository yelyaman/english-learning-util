import { Header } from '../components/Header';
import { topics } from '../data/vocabulary';
import { wordsLabel } from '../format';

interface Props {
  onBack: () => void;
  onSelect: (topicId: string) => void;
}

export function TopicList({ onBack, onSelect }: Props) {
  return (
    <div className="app">
      <Header title="Vocabulary" onBack={onBack} />
      <ul className="list">
        {topics.map((topic) => (
          <li key={topic.id} className="list__item">
            <button className="row" onClick={() => onSelect(topic.id)}>
              <span className="row__title">{topic.title}</span>
              <span className="row__aside">{wordsLabel(topic.words.length)} ›</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
