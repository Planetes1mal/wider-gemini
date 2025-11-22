@echo off
REM Wider Gemini 打包脚本 (Windows)
REM 用于创建 Chrome Web Store 发布包

echo 正在读取版本号...
for /f "tokens=2 delims=:," %%a in ('findstr /c:"version" manifest.json') do set VERSION=%%a
set VERSION=%VERSION:"=%
set VERSION=%VERSION: =%
set PACKAGE_NAME=wider-gemini-%VERSION%.zip

echo 正在打包 Wider Gemini v%VERSION%...

REM 创建临时目录
set TEMP_DIR=%TEMP%\wider-gemini-package-%RANDOM%
mkdir "%TEMP_DIR%"
echo 临时目录: %TEMP_DIR%

REM 复制需要的文件
echo 复制文件...
copy manifest.json "%TEMP_DIR%\" >nul
copy popup.html "%TEMP_DIR%\" >nul
copy popup.js "%TEMP_DIR%\" >nul
copy popup.css "%TEMP_DIR%\" >nul
copy gemini-content.js "%TEMP_DIR%\" >nul
copy gemini-content.css "%TEMP_DIR%\" >nul
copy LICENSE "%TEMP_DIR%\" >nul

REM 复制图标目录
echo 复制图标...
mkdir "%TEMP_DIR%\icons" >nul
copy icons\*.png "%TEMP_DIR%\icons\" >nul

REM 复制国际化语言包目录
echo 复制语言包...
mkdir "%TEMP_DIR%\_locales\en" >nul
mkdir "%TEMP_DIR%\_locales\zh_CN" >nul
copy _locales\en\messages.json "%TEMP_DIR%\_locales\en\" >nul
copy _locales\zh_CN\messages.json "%TEMP_DIR%\_locales\zh_CN\" >nul

REM 创建 ZIP 文件（需要 PowerShell）
echo 创建 ZIP 文件...
powershell -Command "Compress-Archive -Path '%TEMP_DIR%\*' -DestinationPath '%CD%\%PACKAGE_NAME%' -Force"

REM 清理临时目录
rmdir /s /q "%TEMP_DIR%"

echo.
echo ✅ 打包完成: %PACKAGE_NAME%
for %%A in (%PACKAGE_NAME%) do echo 文件大小: %%~zA 字节
echo.
pause

