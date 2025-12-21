Add-Type -AssemblyName System.Drawing

# Create icon.png (1024x1024)
$icon = New-Object System.Drawing.Bitmap(1024, 1024)
$g = [System.Drawing.Graphics]::FromImage($icon)
$brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(99, 102, 241))
$g.FillRectangle($brush, 0, 0, 1024, 1024)
$icon.Save("$PSScriptRoot\assets\icon.png", [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose()
$icon.Dispose()

# Create splash.png (1284x2778 - iPhone 14 Pro Max)
$splash = New-Object System.Drawing.Bitmap(1284, 2778)
$g2 = [System.Drawing.Graphics]::FromImage($splash)
$brush2 = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(99, 102, 241))
$g2.FillRectangle($brush2, 0, 0, 1284, 2778)
$splash.Save("$PSScriptRoot\assets\splash.png", [System.Drawing.Imaging.ImageFormat]::Png)
$g2.Dispose()
$splash.Dispose()

# Create adaptive-icon.png (1024x1024)
$adaptiveIcon = New-Object System.Drawing.Bitmap(1024, 1024)
$g3 = [System.Drawing.Graphics]::FromImage($adaptiveIcon)
$brush3 = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(99, 102, 241))
$g3.FillRectangle($brush3, 0, 0, 1024, 1024)
$adaptiveIcon.Save("$PSScriptRoot\assets\adaptive-icon.png", [System.Drawing.Imaging.ImageFormat]::Png)
$g3.Dispose()
$adaptiveIcon.Dispose()

Write-Host "Icon files created successfully!" -ForegroundColor Green
