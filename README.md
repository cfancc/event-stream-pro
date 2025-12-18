# 🚀 EventStream Pro DevTools

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)]()

**EventStream Pro** 是一款强大的 Chrome DevTools 扩展，专为调试 **Server-Sent Events (SSE)** 和 **流式 Fetch (Streaming Fetch)** 响应而设计。它提供了一个专业、开发者友好的界面，解决了原生网络面板在查看流式数据时的诸多痛点。

## 💡 开发背景与解决痛点

在开发涉及 **Server-Sent Events (SSE)** 或 **流式大模型对话 (LLM Streaming)** 的应用时，原生 Chrome DevTools 的网络面板往往力不从心：

1.  **🤯 Unicode 阅读困难**: 许多流式响应（尤其是 AI 模型输出）直接返回 `\uXXXX` 格式的 Unicode 编码。原生面板无法自动解码，开发者只能看到一堆乱码，必须手动复制转码才能阅读。
2.  **👀 长流数据难以阅读**: 原生面板将流式数据展示为简单的列表，缺乏对复杂 JSON 结构的格式化支持。当单条消息体积极大时，阅读体验极差。
3.  **🔎 缺乏高效搜索**: 在成百上千条流式消息中，很难快速定位到包含特定关键词（如 "Error" 或特定业务字段）的消息。
4.  **📉 调试体验割裂**: 开发者经常需要在没有格式化的预览窗口和外部 JSON 工具之间反复切换，严重影响效率。

**EventStream Pro** 正是为了解决这些痛点而生。它作为一个“增强版”的专用调试面板，无缝集成在 DevTools 中，提供**自动解码**、**JSON 格式化**、**精准搜索**等核心能力，让流式接口调试变得前所未有的轻松。

## ✨ 功能特性

- **🔍 实时捕获**: 自动拦截 `EventSource` 连接和流式 `fetch` 请求，确保不漏掉任何数据块（chunks）。
- **🔡 自动解码**: 智能检测并自动将 `\uXXXX` 格式的 Unicode 转义序列转换为可读文字（例如中文）。
- **📋 持续追踪**: 即使在开启过滤时，消息 ID 依然保持与原始会话一致，方便通过 ID 快速定位。
- **💎 专业级 UI**:
  - **可调节列宽**: 支持像原生 DevTools 一样自由拖拽调整表格列宽。
  - **详情弹窗**: 点击任意行即可在模态框中查看完整且经过格式化的数据负载。
  - **原始/处理切换**: 可随时在处理后的可读数据与原始网络流输出之间切换。
- **🛠️ 灵活搜索**: 支持在解码后的内容或原始网络字符串中进行全文搜索。

## 📸 预览

![EventStream Pro 预览图](https://raw.githubusercontent.com/cfancc/event-stream-pro/refs/heads/main/doc/preview.jpg)

## 📦 安装指南

1. **克隆**本仓库到本地：
   ```bash
   git clone https://github.com/cfancc/event-stream-pro.git
   ```
2. 在根目录下**安装**依赖：
   ```bash
   npm install
   ```
3. **构建**插件：
   ```bash
   npm run build
   ```
4. **加载**到 Chrome 浏览器：
   - 打开 Chrome 浏览器，访问 `chrome://extensions`。
   - 开启右上角的 **开发者模式 (Developer mode)**。
   - 点击 **加载已解压的扩展程序 (Load unpacked)** 并选择项目下的 `/dist` 目录。

## 🏗️ 项目结构

- `extension/`: 核心插件文件 (Manifest V3, Background Service Worker, Content Scripts)。
- `panel/`: 基于 React 的 DevTools 面板 UI 代码。
- `scripts/`: 构建与打包自动化脚本。

## 🤝 参与贡献

欢迎任何形式的贡献！请阅读我们的 [CONTRIBUTING.md](CONTRIBUTING.md) 以了解如何参与项目开发。

## 📄 开源协议

本项目采用 **MIT License** 协议开源。详情请参阅 [LICENSE](LICENSE) 文件。

