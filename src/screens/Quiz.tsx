import { useEffect, useState } from 'react';
import { Header } from '../components/Header';
import { allWords, type Topic } from '../data/vocabulary';
import { isFinished, next, pick, startSession } from '../quiz';
import { haptic } from '../telegram';
import { Result } from './Result';

/** A correct answer moves on by itself; after a mistake the user taps "Дальше". */
const AUTO_ADVANCE_MS = 700;

interface Props {
  topic: Topic;
  onExit: () => void;
}

export function Quiz({ topic, onExit }: Props) {
  const [session, setSession] = useState(() => startSession(topic.words, allWords));
  const current = session.queue[0];
  const answered = session.picked !== null;
  const answeredRight = answered && session.picked === current?.ru;

  useEffect(() => {
    if (!answeredRight) return;
    const timer = setTimeout(() => setSession((s) => next(s)), AUTO_ADVANCE_MS);
    return () => clearTimeout(timer);
  }, [answeredRight]);

  if (isFinished(session)) {
    return (
      <Result
        title={topic.title}
        session={session}
        onRestart={() => setSession(startSession(topic.words, allWords))}
        onExit={onExit}
      />
    );
  }

  function handlePick(option: string) {
    if (answered) return;
    haptic(option === current.ru ? 'success' : 'error');
    setSession((s) => pick(s, option));
  }

  function optionClass(option: string) {
    if (!answered) return 'option';
    if (option === current.ru) return 'option option--correct';
    if (option === session.picked) return 'option option--wrong';
    return 'option option--dim';
  }

  const remaining = session.total - session.learned;

  return (
    <div className="app">
      <Header title={topic.title} onBack={onExit} />

      <div className="progress">
        <div className="progress__labels">
          <span>
            Выучено <strong>{session.learned}</strong> из {session.total}
          </span>
          <span>Осталось {remaining}</span>
        </div>
        <div className="progress__bar">
          <div className="progress__fill" style={{ width: `${(session.learned / session.total) * 100}%` }} />
        </div>
      </div>

      <div className="card">
        <div className="card__hint">Выбери перевод</div>
        <div className="card__word">{current.en}</div>
        {current.pos && <div className="card__pos">{current.pos}</div>}
      </div>

      <div className="options">
        {session.options.map((option) => (
          <button
            key={option}
            className={optionClass(option)}
            disabled={answered}
            onClick={() => handlePick(option)}
          >
            {option}
          </button>
        ))}
      </div>

      {answered && !answeredRight && (
        <div className="actions">
          <button className="btn" onClick={() => setSession((s) => next(s))}>
            Дальше
          </button>
        </div>
      )}
    </div>
  );
}
