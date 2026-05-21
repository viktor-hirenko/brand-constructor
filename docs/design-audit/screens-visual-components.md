# Visual Components - Extended States

Figma: https://www.figma.com/design/aCe1cUDNaA7Tmcn9Mmvv1w/Brand-Builder?node-id=171-4188&m=dev

## 7 States

### 1. Default State
- Аккордеон с типами компонентов (Header, Banners, Tabbar, Theme)
- Все секции collapsed
- iPhone preview пустой или с placeholder

### 2. Variant Selected
- Одна секция expanded
- Выбран конкретный вариант (radio button)
- iPhone preview показывает выбранный вариант

### 3. Incompatible Components Warning
- Warning banner появляется
- Текст: "Обрані компоненти несумісні"
- Список несовместимых комбинаций
- Кнопка "Змінити вибір"

### 4. Incompatible Components - Collapsed
- Warning свёрнут
- Иконка предупреждения остаётся видимой
- Можно развернуть для деталей

### 5. Sidebar State
- Боковая панель с информацией о выбранном компоненте
- Thumbnail увеличенный
- Описание варианта
- Кнопка закрытия

### 6. Delegate Toggle Active
- Toggle "Довірити вибір дизайнерам" включен
- Все секции аккордеона disabled
- Текст пояснения

### 7. Confirmation Modal
- Модалка подтверждения делегирования
- Текст: "Ви впевнені, що хочете довірити вибір дизайнерам?"
- Кнопки: "Так", "Ні"

## Component Types in Accordion

1. **Header** - варианты шапки сайта
2. **Banners** - варианты баннеров
3. **Tabbar** - варианты нижней навигации
4. **Theme** - цветовые темы (связано с Mode selection)

## iPhone Preview Behavior

- Обновляется в реальном времени при выборе
- Показывает комбинацию всех выбранных компонентов
- Рамка iPhone 16 Plus
- Скролл внутри preview для длинного контента
