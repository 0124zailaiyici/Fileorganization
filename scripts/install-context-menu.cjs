// Direct registry manipulation via Node.js — avoids all encoding issues
// because Node.js passes args as UTF-16 to Windows CreateProcess.
const { execSync } = require('child_process');

const KEY = 'HKEY_CLASSES_ROOT\\Folder\\shell\\DownloadOrganizer';
const NAME = '智能整理此文件夹';
const WRAPPER = 'D:\\demo\\AI\\claude\\Fileorganization\\scripts\\context-menu.bat';

function reg(args) {
  try { execSync(`reg ${args}`, { stdio: 'pipe' }); } catch (e) { /* key missing is OK */ }
}

// Remove old keys
reg(`delete "HKEY_CLASSES_ROOT\\Directory\\shell\\DownloadOrganizer" /f`);
reg(`delete "${KEY}" /f`);

// Create new key — command calls the wrapper batch file
reg(`add "${KEY}" /ve /t REG_SZ /d "${NAME}" /f`);
reg(`add "${KEY}" /v Icon /t REG_SZ /d "shell32.dll,167" /f`);
reg(`add "${KEY}\\command" /ve /t REG_SZ /d "cmd.exe /c \\"\\"${WRAPPER}\\" \\"%1\\"\\"" /f`);

console.log('Done — right-click a folder to test (restart Explorer first)');
