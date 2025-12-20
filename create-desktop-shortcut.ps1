$WshShell = New-Object -comObject WScript.Shell
$DesktopPath = [Environment]::GetFolderPath("Desktop")
$ShortcutFile = "$DesktopPath\Run Appad Project.lnk"
$Shortcut = $WshShell.CreateShortcut($ShortcutFile)
$Shortcut.TargetPath = "e:\appad\start-project.bat"
$Shortcut.IconLocation = "e:\appad\mobile\assets\app.ico"
$Shortcut.WorkingDirectory = "e:\appad"
$Shortcut.Description = "Start Appad Backend and Mobile"
$Shortcut.Save()
Write-Host "Shortcut created successfully at: $ShortcutFile"
