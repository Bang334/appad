# PowerShell script to create desktop shortcut
$WshShell = New-Object -ComObject WScript.Shell
$ProjectPath = (Get-Location).Path
$ShortcutPath = "$env:USERPROFILE\Desktop\Start App.lnk"

$Shortcut = $WshShell.CreateShortcut($ShortcutPath)
$Shortcut.TargetPath = "$ProjectPath\start-project.bat"
$Shortcut.WorkingDirectory = $ProjectPath
$Shortcut.Description = "Start Backend and Mobile Development Servers"
$Shortcut.IconLocation = "C:\Windows\System32\imageres.dll,103"  # Music/Media icon
$Shortcut.Save()

Write-Host "Desktop shortcut created successfully!" -ForegroundColor Green
Write-Host "Location: $ShortcutPath" -ForegroundColor Cyan
Write-Host "Project Path: $ProjectPath" -ForegroundColor Yellow

