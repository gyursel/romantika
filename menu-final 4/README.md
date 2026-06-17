# 🍽 Обедно меню — PWA

Дигитално обедно меню за ресторант. Клиентите сканират QR код и виждат менюто. Собственикът го актуализира всеки ден от admin панела.

## Деплой на Vercel (5 минути)

### Стъпка 1 — Качи в GitHub
```bash
cd menu-app
git init
git add .
git commit -m "first commit"
# Създай ново repo в github.com и след това:
git remote add origin https://github.com/ТВОЕТО-ИМЕ/menu-app.git
git push -u origin main
```

### Стъпка 2 — Свържи с Vercel
1. Влез в [vercel.com](https://vercel.com) с GitHub акаунта
2. "Add New Project" → избери `menu-app` repo
3. В **Environment Variables** добави:
   - `NEXT_PUBLIC_ADMIN_PASS` = `твоята-парола`
4. Натисни **Deploy**

### Стъпка 3 — QR код
1. Вземи URL-а от Vercel (напр. `menu-app.vercel.app`)
2. Генерирай QR на [qr-code-generator.com](https://www.qr-code-generator.com)
3. Принтирай и постави на масите

## Локално стартиране
```bash
npm install
npm run dev
# Отвори http://localhost:3000
```

## Admin панел
- Бутон ⚙ Админ (горе вдясно)
- По подразбиране парола: `1234` (смени в Vercel Environment Variables!)

## Следващи стъпки (по желание)
- Firebase Firestore — менюто се пази в облака, не в браузъра
- Много ресторанти от един код
- Снимки към ястията
