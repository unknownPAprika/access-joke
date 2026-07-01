const express = require('express');
const cors = require('cors');
const path = require('path'); // Добавляем модуль для точной работы с путями

const app = express();
app.use(cors());
app.use(express.json());

// Принудительно раздаем статические файлы из текущей папки
app.use(express.static(path.join(__dirname)));

// Явно указываем серверу открывать index.html на главной странице
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Наш эндпоинт для связи с нейросетью
app.post('/api', async (req, res) => {
    const userMessage = req.body.message;
    if (!userMessage) return res.status(400).json({ text: "Пустой запрос" });

    const apiKey = process.env.MISTRAL_API_KEY; 

    try {
        const response = await fetch('https://mistral.ai', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'open-mistral-7b',
                messages: [
                    { role: 'system', content: 'Ты встроенный модуль СУБД MS Access. Отвечай на вопросы пользователя мгновенно, четко, коротко, без приветствий.' },
                    { role: 'user', content: userMessage }
                ],
                max_tokens: 150
            })
        });

        const data = await response.json();
        const aiText = data.choices?.[0]?.message?.content || 'Ошибка структуры данных ИИ.';
        res.json({ text: aiText.trim() });
    } catch (error) {
        res.status(500).json({ text: "Ошибка подключения к серверу нейросети." });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Сервер запущен на порту ${PORT}`));
