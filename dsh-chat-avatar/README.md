# dsh-chat-avatar

IM 风格的圆形头像：在 DeepSeek Harness 的对话里，用户消息右侧、AI 消息左侧各显示一个圆形头像，
头像图片可自行替换，展示大小可调。

## 安装

```powershell
# 通过 DSH 插件管理器安装本目录（绝对路径）
dsh plugin add E:\code\dsh-profile-photo\dsh-chat-avatar
```

或在设置 → 插件页 / `plugin_manager` 工具里以绝对路径安装。

## 使用

打开 **设置 → 消息头像**（Settings → Chat avatars）：

- **开关**：随时显示 / 隐藏全部头像；
- **头像大小**：20–64px；
- **我的头像 / AI 头像**：选择本地图片（自动裁切压缩为 128×128 后保存），或恢复默认图案。

头像偏好保存在浏览器 `localStorage`（键 `dsh-chat-avatar.prefs`），不上传任何数据。

## 实现要点

- 不替换任何 Chat 节点渲染器，也不 shadow 任何 slot：头像只是对话流中既有消息行
  （`[data-chat-flow-kind="user" | "steering" | "assistant-step"]`）上的 `::before` / `::after`
  伪元素；因此流式输出、折叠、分组等行为完全保持原样。
- **不挤占文字**：头像默认落在内容列两侧的空白边距里（AI 在文字左侧、用户在气泡右侧），
  消息行不加横向内边距，所以文字位置和宽度与未开启时完全一致。
  窗口/侧栏太窄（`@container (max-width: 1100px)`）时回退为在行内预留一条空档，
  避免头像被裁切。
- **纵向占位随头像大小变化**：每条消息行使用 `min-height: calc(var(--dsh-ca-size) + 2px)`，
  头像越大，行高自动越高，头像不会与相邻消息叠在一起，文字之间也不会重叠。
- **头像中心对准第一行文字**：按 DSH 自带的两套行高 token 计算——AI 正文是
  markdown base `calc(24px + --dsh-content-font-delta)`，用户气泡是
  `calc(22px + --dsh-content-font-delta)` 且顶部还有 10px 内边距——把头像中心对到首行行框中心。
  头像比行高更高时，行用 `padding-top: max(0px, (size - line) / 2)` 补出上方空间，
  放大头像也不会顶到上一条消息。
- **正圆不依赖 CSS**：默认头像是 SVG 圆形图案；用户上传的图片在 canvas 里先裁成圆形
  （透明圆角），再把 `border-radius`/`clip-path` 作为第二道保险，因此即使页面里有别的
  圆角规则也不会变成"圆角方形"。
- 同一轮里连续的多个 assistant 步骤只显示一个头像（消息组效果）。
- 唯一新增的 UI 座位是一个 `settings.section` 页面（id `chat-avatar`）。
- Node 半边是空插件，只为让 Loader 条目存在并被 `dsh.client` 扫描到。

## 文件

| 文件 | 作用 |
| --- | --- |
| `lib/client.js` | 浏览器半边：注入样式、读写偏好、注册设置页 |
| `lib/index.js` | Node 半边：空实现 |
| `cordis.patch.yml` | bundle 的 loader 条目（`chat-avatar`） |
