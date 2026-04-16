@echo off
title Running Vite Project

echo Dang mo trình duyet...
:: Lưu ý: Khi mở LAN, bạn có thể truy cập qua IP nội bộ thay vì localhost
start http://localhost:5173/

echo Dang khoi dong Vite voi che do Host (LAN)...
:: Thêm -- --host để Vite hiểu và mở cổng mạng
npm run dev -- --host

pause