Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class WinApi {
    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern bool MoveWindow(IntPtr hWnd, int X, int Y, int nWidth, int nHeight, bool bRepaint);
}
"@

Get-Process electron | ForEach-Object {
    $hwnd = $_.MainWindowHandle
    if ($hwnd -ne [IntPtr]::Zero) {
        [WinApi]::MoveWindow($hwnd, 100, 100, 1280, 800, $true)
        [WinApi]::ShowWindow($hwnd, 9)
        [WinApi]::SetForegroundWindow($hwnd)
        Write-Host "Janela movida: PID $($_.Id)"
    }
}
