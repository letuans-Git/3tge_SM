@echo off
title Tro Ly Tu Dong Dan va Gui Zalo PC - 3TGE
chcp 65001 >nul
cls
echo ========================================================================
echo  KHOI DONG TRO LY TU DONG DAN (Ctrl+V) VA GUI (ENTER) ZALO PC - 3TGE
echo ========================================================================
echo Dang chay tap lenh tu dong hoa Zalo tren may tinh...
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0zalo-auto-sender.ps1"
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Co loi khi chay PowerShell. Vui long kiem tra quyen quan tri hoac quyen ExecutionPolicy.
    pause
)
