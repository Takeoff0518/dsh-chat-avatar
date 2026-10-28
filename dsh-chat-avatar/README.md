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
- **不挤占文字**：头像落在内容列两侧的空白边距里（AI 在文字左侧、用户在气泡右侧）。
  实现是给消息行 `margin-*: -gutter` 借出这块边距、再用等量 `padding-*` 还回去，
  因此文字位置和宽度与未开启时完全一致，而头像的落脚点在**行自己的盒子里**——这点是必需的：
  `content-visibility: auto` 会附带 paint containment，画在行外的内容会被裁掉（见兼容性说明）。
  窗口/侧栏太窄（`@container (max-width: 1100px)`）时改为行内预留空档（此时文字会内移）。
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

## 兼容性说明（主题插件）

`dsh-claude-style` 会给每个「非 user」消息行打上 `data-dsh-claude-laid-out`，然后套
`content-visibility: auto`（配合 `contain-intrinsic-size: auto 240px`）做长对话的绘制优化。
`content-visibility: auto` **始终**附带 paint containment，会把画在行盒子之外的内容裁掉：

- 0.1.2 及以前，AI 头像是 `left: -gutter` 偏移到行外的，于是被裁掉 → AI 头像消失；
- 用户行被主题的 `:not([data-chat-flow-kind=user])` 排除在外 → 用户头像还在；
- 主题只在**可见**行上打标记（rAF 的 read/write 批次），所以切换会话时先渲染一帧无标记的样子
  → 头像"一闪而过"，下一帧标记落地后消失。

0.1.3 起头像落在行自己的 `padding` 区域内（见上），行外不再画任何东西，因此不受 paint
containment 影响，主题也能保留它的优化。折叠的 step-process 面板（`[data-step-process-content]`）
里是带内边距的元信息卡片，那里不画头像，也不借边距。

## 文件

| 文件 | 作用 |
| --- | --- |
| `lib/client.js` | 浏览器半边：注入样式、读写偏好、注册设置页 |
| `lib/index.js` | Node 半边：空实现 |
| `cordis.patch.yml` | bundle 的 loader 条目（`chat-avatar`） |
