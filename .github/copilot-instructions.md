## 目标
为 AI 编码代理提供尽快上手本仓库的最小、可执行说明：代码组织、开发/调试命令、常见约定与容易出错的地方。

## 项目一览（大局）
- 本仓库是一个静态前端示例（动漫/课堂风格的 AI 语音助手），UI 文件放在 `docs/` 下：`docs/index.html`, `docs/css/`, `docs/js/`, `docs/assets/`。
- 前端通过本地 `live-server` 提供热重载（`package.json` 中配置了 `start` 脚本），并集成了一个第三方客户端库 `deepseek-client.js`（位于 `docs/libs/` 或 `src/libs/`，请搜索确认）。

## 关键文件（快速引用）
- `docs/index.html` — 页面骨架，主要 DOM、按钮 id（例如 `voiceBtn`, `sendBtn`, `userInput`）在此定义。
- `docs/js/main.js` — 交互逻辑与 DeepSeek API 调用点（主要修改点）。
- `docs/css/styles.css` — 样式。
- `docs/assets/avatars/default.png` — 默认头像，替换头像即更换此文件或在 `assets/avatars/` 下添加新文件并修改 `index.html` 的 `src`。
- `package.json` — npm 脚本（注意：当前 `package.json` 的 `start` 指向 `src`，但代码位于 `docs`；在修改前请核对并修正为 `live-server docs`）。

## 开发 / 运行（明确命令）
1. 安装依赖：

   ```powershell
   npm install
   ```

2. 启动开发服务器（若 `package.json` 未指向 `docs`，请改为下面命令或修 package.json）：

   ```powershell
   npx live-server docs
   # 或修 package.json 的 start 脚本为 "live-server docs" 然后使用
   npm start
   ```

3. 调试：打开浏览器开发者工具（Console / Network），页面控制按钮在 `docs/index.html` 中通过 id 绑定。修改 JS/CSS 后浏览器会自动刷新。

## 项目约定与注意点（针对 AI 代理）
- 编辑位置优先选择 `docs/` 而不是 `src/`（历史/README 中的 `src` 说明与仓库实际结构有不一致）。在做改动前先搜索 `index.html` 中的引用路径确认真实文件位置。
- DOM 操作使用原生 JS（`docs/js/main.js`），避免引入大型框架；新增功能请遵循现有风格：直接操纵 DOM、使用现有 id/class。
- 与后端/API 的集成点：`deepseek-client.js`（或 `deepseek-client` package）是主要的外部依赖；修改 API 调用时，查找 `main.js` 中的调用处并保持异步 Promise/then 风格一致。
- 没有自动化测试或构建流程（`build`/`test` 脚本目前是占位）。若添加构建或测试，最好保持简单：静态资源构建工具（如 gulp/webpack）需在 `package.json` 中声明并写入对应脚本。

## 代码示例（常见修改）
- 更新默认头像：编辑 `docs/index.html` 中 `<img id="avatarImg" src="assets/avatars/default.png">` 或把新图片放到 `docs/assets/avatars/` 并修改 `src`。
- 修改唤醒/发送按钮逻辑：在 `docs/js/main.js` 中查找 `document.getElementById('voiceBtn')` / `sendBtn` 并修改事件处理函数。

## 小心陷阱
- 目录不一致：仓库自带 README 示例提到 `src/`，实际可见代码在 `docs/`；先搜索确认再改 `package.json`。
- 外部依赖：`deepseek-client` 既可能是 `docs/libs/deepseek-client.js` 的本地文件，也可能是 package.json 中声明的 npm 包。修改或更新时请确认来源并同步修改引用路径。

## 如果你是 AI 代理，优先执行的 3 个步骤
1. 在仓库根运行 `npm install`，然后 `npx live-server docs` 验证页面能本地启动。
2. 打开 `docs/index.html`，定位目标 DOM 节点（例如 `voiceBtn`, `userInput`），在 `docs/js/main.js` 中找到相应事件处理代码。
3. 搜索 `deepseek`（`grep -R "deepseek" .`）以定位 API 使用位置并确认调用契约（输入/输出格式）。

## 需要人工确认（问用户）
- 希望部署/构建到哪个目录（`docs/` 或 `dist/`）？是否要把 `package.json` 的 `start` 修正为 `live-server docs`？

----
如果这份说明有遗漏或你想要更详细的分支/部署策略，我可以基于仓库其他文件做迭代。请告诉我你希望 AI 代理优先执行的第一个任务（例如：修正 package.json / 添加 avatar 切换 UI / 查找 DeepSeek 调用）。
