import { insideTelegram, useTelegramBackButton } from '../telegram';

interface Props {
  title: string;
  onBack?: () => void;
}

/** Screen title. Inside Telegram "back" is the native button; in a browser it is drawn here. */
export function Header({ title, onBack }: Props) {
  useTelegramBackButton(onBack);
  return (
    <header className="header">
      {onBack && !insideTelegram && (
        <button className="header__back" onClick={onBack} aria-label="Назад">
          ‹
        </button>
      )}
      <h1 className="header__title">{title}</h1>
    </header>
  );
}
