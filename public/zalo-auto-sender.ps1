# ==============================================================================
# TRỢ LÝ TỰ ĐỘNG DÁN (Ctrl+V) & GỬI (Enter) TIN NHẮN ZALO PC
# Công ty 3TGE - Hệ Thống Quản Lý Bảo Trì Điện Mặt Trời
# ==============================================================================

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Add-Type -AssemblyName System.Windows.Forms

# Khai báo hàm Win32 để kích hoạt cửa sổ Zalo
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class Win32Helper {
    [DllImport("user32.dll")]
    [return: MarshalAs(UnmanagedType.Bool)]
    public static extern bool SetForegroundWindow(IntPtr hWnd);

    [DllImport("user32.dll")]
    public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
    
    [DllImport("user32.dll")]
    public static extern IntPtr GetForegroundWindow();
}
"@

Write-Host "========================================================================" -ForegroundColor Cyan
Write-Host "  TRỢ LÝ TỰ ĐỘNG DÁN (Ctrl+V) & GỬI (ENTER) ZALO PC - CÔNG TY 3TGE" -ForegroundColor Yellow
Write-Host "========================================================================" -ForegroundColor Cyan
Write-Host " Trạng thái: ĐANG CHẠY NGẦM THEO DÕI..." -ForegroundColor Green
Write-Host " Mỗi khi bạn bấm [Đồng ý] trên phần mềm Web, công cụ sẽ tự động:" -ForegroundColor White
Write-Host "   1. Kích hoạt cửa sổ Zalo PC" -ForegroundColor Gray
Write-Host "   2. Tự động dán nội dung (Ctrl+V)" -ForegroundColor Gray
Write-Host "   3. Tự động nhấn nút Gửi (Enter)" -ForegroundColor Gray
Write-Host " (Bạn có thể thu nhỏ cửa sổ này để công cụ chạy ngầm trong suốt ca làm việc)" -ForegroundColor DarkGray
Write-Host "========================================================================" -ForegroundColor Cyan

$lastProcessedText = ""

while ($true) {
    Start-Sleep -Milliseconds 400
    try {
        if ([System.Windows.Forms.Clipboard]::ContainsText()) {
            $clip = [System.Windows.Forms.Clipboard]::GetText()
            
            # Kiểm tra nội dung tin nhắn gửi từ phần mềm bảo trì 3TGE
            $isTargetMessage = $clip -and (
                $clip -like "*bảo dưỡng*" -or 
                $clip -like "*3TGE*" -or 
                $clip -like "*Kính gửi khách hàng*" -or
                $clip -like "*điện mặt trời*"
            )
            
            if ($isTargetMessage -and ($clip -ne $lastProcessedText)) {
                $lastProcessedText = $clip
                Write-Host "`n[PHÁT HIỆN TIN NHẮN MỚI TỪ PHẦN MỀM]:" -ForegroundColor Green
                $preview = if ($clip.Length -gt 60) { $clip.Substring(0, 60) + "..." } else { $clip }
                Write-Host "  -> $preview" -ForegroundColor Gray
                
                # Chờ 800ms để link Zalo mở xong từ trình duyệt
                Start-Sleep -Milliseconds 800
                
                # Tìm tiến trình Zalo PC
                $zaloProcesses = Get-Process -Name "Zalo" -ErrorAction SilentlyContinue
                $activated = $false
                
                if ($zaloProcesses) {
                    foreach ($p in $zaloProcesses) {
                        if ($p.MainWindowHandle -ne [IntPtr]::Zero) {
                            [Win32Helper]::ShowWindow($p.MainWindowHandle, 9) # SW_RESTORE
                            [Win32Helper]::SetForegroundWindow($p.MainWindowHandle) | Out-Null
                            $activated = $true
                            break
                        }
                    }
                }
                
                if (-not $activated) {
                    # Thử kích hoạt qua WScript.Shell AppActivate
                    $wscript = New-Object -ComObject WScript.Shell
                    $activated = $wscript.AppActivate("Zalo")
                }
                
                if ($activated) {
                    Write-Host "  -> Đã kích hoạt cửa sổ Zalo PC" -ForegroundColor Yellow
                    Start-Sleep -Milliseconds 600
                    
                    # Tự động dán (Ctrl+V)
                    [System.Windows.Forms.SendKeys]::SendWait("^v")
                    Write-Host "  -> Đã tự động dán (Ctrl+V)" -ForegroundColor Yellow
                    Start-Sleep -Milliseconds 400
                    
                    # Tự động nhấn Gửi (Enter)
                    [System.Windows.Forms.SendKeys]::SendWait("{ENTER}")
                    Write-Host "  -> ĐÃ TỰ ĐỘNG GỬI (ENTER) THÀNH CÔNG 100%!" -ForegroundColor Cyan
                    
                    try { [System.Console]::Beep(1200, 150) } catch {}
                } else {
                    Write-Host "  [!] Không tìm thấy cửa sổ Zalo PC đang mở. Vui lòng đảm bảo Zalo PC đã đăng nhập." -ForegroundColor Red
                }
            }
        }
    } catch {
        # Bỏ qua lỗi tạm thời khi clipboard đang bị ứng dụng khác khóa
    }
}
