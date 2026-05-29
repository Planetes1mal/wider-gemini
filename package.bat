@echo off
REM Builds a Chrome Web Store ZIP on Windows

echo Reading version...
for /f "tokens=2 delims=:," %%a in ('findstr /c:"version" manifest.json') do set VERSION=%%a
set VERSION=%VERSION:"=%
set VERSION=%VERSION: =%
set PACKAGE_NAME=wider-gemini-%VERSION%.zip

echo Packaging Wider Gemini v%VERSION%...

REM Create temp directory
set TEMP_DIR=%TEMP%\wider-gemini-package-%RANDOM%
mkdir "%TEMP_DIR%"
echo Temp directory: %TEMP_DIR%

REM Copy required files
echo Copying files...
copy manifest.json "%TEMP_DIR%\" >nul
copy popup.html "%TEMP_DIR%\" >nul
copy popup.js "%TEMP_DIR%\" >nul
copy popup.css "%TEMP_DIR%\" >nul
copy settings-utils.js "%TEMP_DIR%\" >nul
copy gemini-content.js "%TEMP_DIR%\" >nul
copy gemini-content.css "%TEMP_DIR%\" >nul
copy LICENSE "%TEMP_DIR%\" >nul

REM Copy icon directory
echo Copying icon directory...
mkdir "%TEMP_DIR%\icons" >nul
copy icons\*.png "%TEMP_DIR%\icons\" >nul

REM Copy localization files
echo Copying localization files...
mkdir "%TEMP_DIR%\_locales\en" >nul
mkdir "%TEMP_DIR%\_locales\zh_CN" >nul
copy _locales\en\messages.json "%TEMP_DIR%\_locales\en\" >nul
copy _locales\zh_CN\messages.json "%TEMP_DIR%\_locales\zh_CN\" >nul

REM Create ZIP file (requires PowerShell)
echo Creating ZIP file...
powershell -Command "Compress-Archive -Path '%TEMP_DIR%\*' -DestinationPath '%CD%\%PACKAGE_NAME%' -Force"

REM Clean up temp directory
rmdir /s /q "%TEMP_DIR%"

echo.
echo Done: %PACKAGE_NAME%
for %%A in (%PACKAGE_NAME%) do echo Size: %%~zA bytes
echo.
pause
