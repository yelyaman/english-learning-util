import { Header } from '../components/Header';
import { wordsLabel } from '../format';
import type { Session } from '../quiz';

interface Props {
  title: string;
  session: Session;
  onRestart: () => void;
  onExit: () => void;
}

export function Result({ title, session, onRestart, onExit }: Props) {
  return (
    <div className="app">
      <Header title={title} onBack={onExit} />

      <div className="result">
        <div className="result__emoji">🎉</div>
        <div className="result__title">Готово!</div>
        <div className="result__sub">
          {wordsLabel(session.total)} · ошибок: {session.mistakes}
        </div>
      </div>

      {session.missed.length > 0 && (
        <>
          <div className="section-title">Слова с ошибками</div>
          <ul className="list">
            {session.missed.map((word) => (
              <li key={`${word.en}|${word.ru}`} className="list__item">
                <div className="row">
                  <span className="row__title">
                    {word.en}
                    {word.pos && <span className="row__pos">{word.pos}</span>}
                  </span>
                  <span className="row__aside">{word.ru}</span>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="actions">
        <button className="btn" onClick={onRestart}>
          Пройти ещё раз
        </button>
        <button className="btn btn--secondary" onClick={onExit}>
          К списку файлов
        </button>
      </div>
    </div>
  );
}
