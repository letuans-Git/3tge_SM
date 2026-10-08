@echo off
title Tro Ly Tu Dong Dan va Gui Zalo PC - 3TGE
chcp 65001 >nul
cls
echo ========================================================================
echo   TRỢ LÝ TỰ ĐỘNG DÁN (Ctrl+V) VÀ GỬI (ENTER) ZALO PC - CÔNG TY 3TGE
echo ========================================================================
echo.
echo Đang khởi động trợ lý tự động dán và gửi Zalo trên máy tính...
echo.

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
"$code = @'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Add-Type -AssemblyName System.Windows.Forms
Add-Type @'
using System;
using System.Runtime.InteropServices;
public class Win32Helper {
    [DllImport(\"user32.dll\")]
    public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport(\"user32.dll\")]
    public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
}
'@

Write-Host '========================================================================' -ForegroundColor Cyan
Write-Host '  TRỢ LÝ TỰ ĐỘNG DÁN (Ctrl+V) & GỬI (ENTER) ZALO PC - CÔNG TY 3TGE' -ForegroundColor Yellow
Write-Host '========================================================================' -ForegroundColor Cyan
Write-Host ' Trạng thái: ĐANG CHẠY NGẦM THEO DÕI...' -ForegroundColor Green
Write-Host ' Mỗi khi bạn bấm [Đồng ý] trên phần mềm Web, công cụ sẽ tự động:' -ForegroundColor White
Write-Host '   1. Kích hoạt cửa sổ Zalo PC' -ForegroundColor Gray
Write-Host '   2. Tự động dán nội dung (Ctrl+V)' -ForegroundColor Gray
Write-Host '   3. Tự động nhấn nút Gửi (Enter)' -ForegroundColor Gray
Write-Host ' (Bạn có thể thu nhỏ cửa sổ này để công cụ chạy ngầm trong suốt ca làm việc)' -ForegroundColor DarkGray
Write-Host '========================================================================' -ForegroundColor Cyan

$lastProcessedText = ''

while ($true) {
    Start-Sleep -Milliseconds 400
    try {
        if ([System.Windows.Forms.Clipboard]::ContainsText()) {
            $clip = [System.Windows.Forms.Clipboard]::GetText()
            $isTarget = $clip -and ($clip -like '*bảo dưỡng*' -or $clip -like '*3TGE*' -or $clip -like '*Kính gửi khách hàng*')
            if ($isTarget -and ($clip -ne $lastProcessedText)) {
                $lastProcessedText = $clip
                Write-Host ('`n[PHÁT HIỆN TIN NHẮN TỪ PHẦN MỀM] Đang tự động gửi qua Zalo...') -ForegroundColor Green
                Start-Sleep -Milliseconds 800
                $activated = $false
                $zaloProcesses = Get-Process -Name 'Zalo' -ErrorAction SilentlyContinue
                if ($zaloProcesses) {
                    foreach ($p in $zaloProcesses) {
                        if ($p.MainWindowHandle -ne [IntPtr]::Zero) {
                            [Win32Helper]::ShowWindow($p.MainWindowHandle, 9)
                            [Win32Helper]::SetForegroundWindow($p.MainWindowHandle) | Out-Null
                            $activated = $true
                            break
                        }
                    }
                }
                if (-not $activated) {
                    $wscript = New-Object -ComObject WScript.Shell
                    $activated = $wscript.AppActivate('Zalo')
                }
                if ($activated) {
                    Write-Host '  -> Đã kích hoạt cửa sổ Zalo' -ForegroundColor Yellow
                    Start-Sleep -Milliseconds 600
                    [System.Windows.Forms.SendKeys]::SendWait('^v')
                    Write-Host '  -> Đã tự động dán (Ctrl+V)' -ForegroundColor Yellow
                    Start-Sleep -Milliseconds 400
                    [System.Windows.Forms.SendKeys]::SendWait('{ENTER}')
                    Write-Host '  -> ĐÃ TỰ ĐỘNG GỬI (ENTER) THÀNH CÔNG 100%!' -ForegroundColor Cyan
                    try { [System.Console]::Beep(1200, 150) } catch {}
                } else {
                    Write-Host '  [!] Chưa tìm thấy cửa sổ Zalo PC đang mở. Hãy mở và đăng nhập Zalo PC.' -ForegroundColor Red
                }
            }
        }
    } catch {}
}
'@; Invoke-Expression $code"

pause
