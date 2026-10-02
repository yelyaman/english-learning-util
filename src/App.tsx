import { useState } from 'react';
import { topics } from './data/vocabulary';
import { Home } from './screens/Home';
import { Quiz } from './screens/Quiz';
import { TopicList } from './screens/TopicList';

type Screen = { name: 'home' } | { name: 'topics' } | { name: 'quiz'; topicId: string };

export function App() {
  const [screen, setScreen] = useState<Screen>({ name: 'home' });

  switch (screen.name) {
    case 'home':
      return <Home onOpenVocabulary={() => setScreen({ name: 'topics' })} />;
    case 'topics':
      return (
        <TopicList
          onBack={() => setScreen({ name: 'home' })}
          onSelect={(topicId) => setScreen({ name: 'quiz', topicId })}
        />
      );
    case 'quiz': {
      const topic = topics.find((t) => t.id === screen.topicId)!;
      return <Quiz key={topic.id} topic={topic} onExit={() => setScreen({ name: 'topics' })} />;
    }
  }
}
