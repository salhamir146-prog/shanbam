# آزمون «برای شبنم» + Cloudflare KV

## معماری
- `index.html` → روی GitHub Pages
- `worker.js` → روی Cloudflare Workers
- KV namespace با نام `ANALYTICS` → ذخیره رویدادها
- `admin.html` → پنل مشاهده آمار

## نکته مهم
این پروژه عمداً اطلاعات شخصی مثل IP، GPS، نام، شماره تلفن یا ایمیل جمع نمی‌کند.
کاربر قبل از ثبت بازدید/جواب‌ها یک پیام شفاف می‌بیند و خودش اجازه می‌دهد.

## راه‌اندازی Worker
1. در Cloudflare یک Worker بساز.
2. محتوای `worker.js` را داخل آن قرار بده.
3. یک KV Namespace بساز و آن را با variable name `ANALYTICS` به Worker متصل کن.
4. یک Secret/Environment Variable به نام `ADMIN_TOKEN` بساز و یک مقدار طولانی و تصادفی برای آن بگذار.
5. Worker را Deploy کن.
6. آدرس Worker مثلاً `https://shanbam-analytics.example.workers.dev` را در `index.html` و `admin.html` جایگزین `https://YOUR-WORKER.workers.dev` کن.

## GitHub Pages
`index.html` را در repository بگذار و GitHub Pages را فعال کن.
برای امنیت بهتر، `admin.html` را داخل همان سایت عمومی نگذار؛ آن را ترجیحاً پشت Cloudflare Access یا روی یک دامنه/صفحه خصوصی قرار بده.
اگر آن را عمومی می‌گذاری، توکن را در HTML قرار نده؛ در این پروژه توکن از خودت در فرم پنل گرفته می‌شود.

## محدودیت KV
KV برای این پروژه کوچک مناسب است، اما برای حجم بالای داده یا گزارش‌گیری پیچیده، Cloudflare D1 انتخاب ساختاریافته‌تری است.
