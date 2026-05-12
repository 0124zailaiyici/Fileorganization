# Run as Administrator
$name = "智能整理此文件夹"
$cmd = "powershell.exe -NoExit -Command `"node 'D:\demo\AI\claude\Fileorganization\dist\index.js' organize --path '%1'`""

# Remove old keys first
Remove-Item -Path "Registry::HKEY_CLASSES_ROOT\Directory\shell\DownloadOrganizer" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "Registry::HKEY_CLASSES_ROOT\Folder\shell\DownloadOrganizer" -Recurse -Force -ErrorAction SilentlyContinue

# Add new key
$key = New-Item -Path "Registry::HKEY_CLASSES_ROOT\Folder\shell\DownloadOrganizer" -Force
Set-ItemProperty -Path $key.PSPath -Name "(default)" -Value $name
Set-ItemProperty -Path $key.PSPath -Name "Icon" -Value "shell32.dll,167"
$cmdKey = New-Item -Path "$($key.PSPath)\command" -Force
Set-ItemProperty -Path $cmdKey.PSPath -Name "(default)" -Value $cmd

Write-Host "OK - restart Explorer or logout/login"
Read-Host
