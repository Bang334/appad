Add-Type -AssemblyName System.Drawing

$pngPath = "e:\appad\mobile\assets\icon.png"
$icoPath = "e:\appad\mobile\assets\app.ico"

if (Test-Path $pngPath) {
    try {
        $img = [System.Drawing.Bitmap]::FromFile($pngPath)
        $handle = $img.GetHicon()
        $icon = [System.Drawing.Icon]::FromHandle($handle)
        
        $fileStream = New-Object System.IO.FileStream($icoPath, "Create")
        $icon.Save($fileStream)
        $fileStream.Close()
        
        $img.Dispose()
        $icon.Dispose()
        
        Write-Host "Successfully converted PNG to ICO at $icoPath"
    } catch {
        Write-Error "Failed to convert icon: $_"
    }
} else {
    Write-Error "Source PNG not found at $pngPath"
}
