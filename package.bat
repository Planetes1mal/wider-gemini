@echo off
REM Shared packaging logic also runs in GitHub Actions.
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\package.ps1" %*
exit /b %ERRORLEVEL%
