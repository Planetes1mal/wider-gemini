#!/bin/bash

# Wider Gemini 打包脚本
# 用于创建 Chrome Web Store 发布包

VERSION=$(grep '"version"' manifest.json | cut -d'"' -f4)
PACKAGE_NAME="wider-gemini-${VERSION}.zip"

echo "正在打包 Wider Gemini v${VERSION}..."

# 创建临时目录
TEMP_DIR=$(mktemp -d)
echo "临时目录: ${TEMP_DIR}"

# 复制需要的文件
echo "复制文件..."
cp manifest.json "${TEMP_DIR}/"
cp popup.html "${TEMP_DIR}/"
cp popup.js "${TEMP_DIR}/"
cp popup.css "${TEMP_DIR}/"
cp gemini-content.js "${TEMP_DIR}/"
cp gemini-content.css "${TEMP_DIR}/"
cp LICENSE "${TEMP_DIR}/"

# 复制图标目录
echo "复制图标..."
mkdir -p "${TEMP_DIR}/icons"
cp icons/*.png "${TEMP_DIR}/icons/"

# 创建 ZIP 文件
echo "创建 ZIP 文件..."
cd "${TEMP_DIR}"
zip -r "${OLDPWD}/${PACKAGE_NAME}" . -x "*.DS_Store" "*.git*" "*.zip"
cd "${OLDPWD}"

# 清理临时目录
rm -rf "${TEMP_DIR}"

echo "✅ 打包完成: ${PACKAGE_NAME}"
echo "文件大小: $(du -h ${PACKAGE_NAME} | cut -f1)"

