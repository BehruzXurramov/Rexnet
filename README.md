# Rexnet

Rexnet ehtiyoj va takliflarni AI yordamida ajratib, mos foydalanuvchilarni bog‘laydigan universitet MVP loyihasidir.

Platforma foydalanuvchi matnidan ehtiyoj va taklif bloklarini yaratadi, ularni semantik jihatdan qidiradi va mos kelgan foydalanuvchilarni bog‘laydi.

## Ishga tushirish

Talablar: Node.js 20+, PostgreSQL 15+ va `vector` kengaytmasi.

1. `backend/.env.example` nusxasini `.env` nomi bilan yarating va `DATABASE_URL`, `JWT_SECRET`, `GEMINI_API_KEY` hamda SMTP qiymatlarini kiriting.
2. PostgreSQL bazasida `CREATE EXTENSION vector;` ni yoqing.
3. `cd backend; npm install; npm run migration:run; npm run start:dev`
4. Boshqa terminalda `cd frontend; npm install; npm run dev`

Frontend API manzili `frontend/.env` ichida `VITE_API_URL` orqali sozlanadi. Uzoq PostgreSQL uchun Neon pooled URL ishlatish mumkin; ishlab chiqarishda SSL yoqiladi. Gemini uchun model nomlari va 768 o‘lchamli `text-embedding-004` bir xil saqlanishi kerak. SMTP sozlanmasa, ro‘yxatdan o‘tish tasdiqlash xatini yubora olmaydi.

## Cheklovlar

Bu MVPda chat, to‘lov, bron qilish va kalibrlangan match ehtimoli yo‘q. Gemini va SMTP kvotalari tashqi xizmatlarga bog‘liq. AI kaliti bo‘lmasa, blok tahlili ataylab aniq xato bilan to‘xtaydi.
