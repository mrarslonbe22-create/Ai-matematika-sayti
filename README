# 🧮 MathAI Ustoz

AI bilan matematikani o'rganish platformasi. Foydalanuvchi darajasiga qarab AI savollar beradi, zaif mavzularni aniqlab tushuntiradi.

## ✨ Imkoniyatlar

- 🔐 Ro'yxatdan o'tish / Kirish
- 🧠 AI test (har o'quvchiga har xil savollar, darajaga mos)
- 📈 10 darajali o'sish tizimi
- ⚠ Zaif mavzularni aniqlash va kuchaytirish
- 📚 30 mavzu bo'yicha AI darsliklar
- 💬 AI Ustoz chat (faqat matematika)
- 📊 Statistika va yutuqlar

---

## 🚀 Deploy qilish (10 daqiqa)

### 1. API Key olish
1. [console.anthropic.com](https://console.anthropic.com) ga o'ting
2. Ro'yxatdan o'ting ($5 bepul kredit beriladi)
3. **API Keys** → **Create Key** bosing
4. Kalitni nusxalab oling (sk-ant-...)

### 2. GitHub'ga yuklash
```bash
# GitHub'da yangi repository oching: mathustoz (public yoki private)

git init
git add .
git commit -m "MathAI Ustoz"
git branch -M main
git remote add origin https://github.com/SIZNING_USERNAME/mathustoz.git
git push -u origin main
```

### 3. Vercel'da deploy
1. [vercel.com](https://vercel.com) ga kiring (GitHub bilan)
2. **New Project** → GitHub repo'ni tanlang
3. **Environment Variables** bo'limida:
   - **Name**: `GROQ_API_KEY`
   - **Value**: `gsk_xxxxxxxxx` (olgan kalitingiz)
4. **Deploy** bosing ✅

Bir necha daqiqada havola tayyor bo'ladi:
`https://mathustoz.vercel.app` (yoki shunga o'xshash)

---

## 📁 Fayl tuzilmasi

```
mathustoz/
├── api/
│   └── chat.js          ← API key shu yerda yashirin
├── src/
│   ├── main.jsx
│   └── App.jsx          ← Asosiy kod
├── index.html
├── package.json
├── vite.config.js
├── vercel.json
└── .env.example
```

---

## 💰 Narx hisob-kitobi

| Faoliyat | Token | Narx |
|----------|-------|------|
| 30 savol generatsiya | ~2000 token | ~$0.006 |
| AI tahlil | ~500 token | ~$0.0015 |
| Chat xabar | ~200 token | ~$0.0006 |
| **1 o'quvchi 1 test** | ~3000 token | **~$0.009** |

$5 kredit ≈ 550 ta to'liq test sessiyasi 🎉

---

## 🎯 Daraja tizimi

| Daraja | Murakkablik | Mavzular |
|--------|-------------|---------|
| 1-3 | Oson | Arifmetika, kasrlar, foizlar |
| 4-6 | O'rta | Algebra, geometriya, trigonometriya |
| 7-9 | Qiyin | Logarifm, integral, differentsial |
| 10 | Ekspert | Eng qiyin masalalar |

Daraja oshish: 30 ta testda **87%+** to'g'ri javob
Daraja tushishi: 30 ta testda **40%-** to'g'ri javob
