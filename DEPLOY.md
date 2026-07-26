# 🚀 راهنمای استقرار (Deployment)

## روش ۱: Railway (پیشنهادی - رایگان)

### مرحله ۱: آماده‌سازی پروژه

```bash
# 1. یک GitHub repository جدید بسازید
# 2. فایل‌های پروژه را push کنید

git init
git add .
git commit -m "English Learning Mini App"
git remote add origin https://github.com/YOUR_USERNAME/english-learning-bot.git
git push -u origin main
```

### مرحله ۲: اتصال به Railway

1. به [railway.app](https://railway.app) بروید
2. با GitHub لاگین کنید
3. روی **New Project** کلیک کنید
4. **Deploy from GitHub repo** را انتخاب کنید
5. ریپازیتوری خود را انتخاب کنید

### مرحله ۳: تنظیم متغیرهای محیطی

در پنل Railway، تب **Variables** را باز کنید و این مقادیر را اضافه کنید:

```
BOT_TOKEN=توکن_جدید_ربات_شما
ADMIN_IDS=آیدی_تلگرام_شما
NODE_ENV=production
PORT=3000
DATABASE_PATH=./data/bot.db
JWT_SECRET=یک_کلید_تصادفی_طولانی
```

### مرحله ۴: دریافت توکن ربات

1. به @BotFather در تلگرام بروید
2. `/newbot` را بزنید
3. نام ربات را وارد کنید
4. توکن را کپی کنید

### مرحله ۵: تنظیم Mini App

1. به @BotFather بروید
2. `/setmenubutton` را بزنید
3. ربات خود را انتخاب کنید
4. URL زیر را وارد کنید:
```
https://YOUR-APP-NAME.up.railway.app
```
5. متن دکمه: `🚀 شروع یادگیری`

### مرحله ۶: تست

1. ربات را در تلگرام باز کنید
2. `/start` را بزنید
3. روی **🚀 شروع یادگیری** کلیک کنید
4. Mini App باز می‌شود!

---

## روش ۲: VPS (هاست اختصاصی)

### نصب روی Ubuntu/Debian

```bash
# آپدیت سیستم
sudo apt update && sudo apt upgrade -y

# نصب Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# نصب PM2
sudo npm install -g pm2

# کلون پروژه
git clone https://github.com/YOUR_USERNAME/english-learning-bot.git
cd english-learning-bot

# نصب وابستگی‌ها
npm install

# تنظیم فایل .env
cp .env.example .env
nano .env  # توکن و تنظیمات را وارد کنید

# بیلد و راه‌اندازی
npm run build
npm run setup

# اجرا با PM2
pm2 start dist/index.js --name english-bot
pm2 save
pm2 startup

# وضعیت را چک کنید
pm2 status
pm2 logs english-bot
```

### نصب Nginx (برای دسترسی HTTPS)

```bash
# نصب Nginx
sudo apt install -y nginx

# تنظیم reverse proxy
sudo nano /etc/nginx/sites-available/english-bot
```

محتوای فایل:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# فعال‌سازی
sudo ln -s /etc/nginx/sites-available/english-bot /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# SSL با Certbot
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

---

## روش ۳: Docker

```bash
# بیلد تصویر
docker build -t english-learning-bot .

# اجرا
docker run -d \
  --name english-bot \
  -p 3000:3000 \
  -e BOT_TOKEN=your_token_here \
  -e ADMIN_IDS=your_id_here \
  -e NODE_ENV=production \
  -v $(pwd)/data:/app/data \
  english-learning-bot
```

---

## عیب‌یابی

### ربات جواب نمی‌دهد
```bash
# لاگ‌ها را چک کنید
pm2 logs english-bot

# یا در Docker
docker logs english-bot
```

### Mini App باز نمی‌شود
1. URL در @BotFather را چک کنید
2. گواهی SSL معتبر است؟
3. متغیر `WEBAPP_URL` درست است؟

### خطا در دیتابیس
```bash
# دیتابیس را ریست کنید
rm data/bot.db
npm run setup
```
