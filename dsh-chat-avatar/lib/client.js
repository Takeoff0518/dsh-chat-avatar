window.__ModuleLoader__.load({
	id: "dsh-chat-avatar",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

		const React = require("react");
		const h = React.createElement;

		/**
		 * Browser half of the chat avatars: one stylesheet anchored on the chat
		 * flow rows the Conversation renderer already tags (`data-chat-flow-kind`),
		 * plus one settings page that edits the images and the display size.
		 *
		 * No slot is shadowed and no message renderer is replaced: the avatar is a
		 * pseudo-element of the existing message row, so every later Conversation
		 * change (streaming, folding, groups) keeps its own layout.
		 */

		/** Preference storage key; preferences stay on this browser. */
		const STORAGE_KEY = "dsh-chat-avatar.prefs";
		/** Stable style-tag identity so a re-executed bundle never doubles the CSS. */
		const STYLE_KEY = "dsh-chat-avatar/style.css";
		const MIN_SIZE = 20;
		const MAX_SIZE = 64;
		const DEFAULT_SIZE = 32;

		/**
		 * Built-in user avatar (slate-blue disc + neutral person glyph).
		 *
		 * The disc is a real SVG circle, not a full-bleed rectangle, so the artwork
		 * stays round even if a page-wide rule re-shapes the element's corners.
		 */
		const DEFAULT_USER =
			"data:image/svg+xml;charset=utf-8," +
			encodeURIComponent(
				'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
					'<defs><linearGradient id="u" x1="0" y1="0" x2="0" y2="1">' +
					'<stop offset="0" stop-color="#9fb2d2"/><stop offset="1" stop-color="#6a80a6"/>' +
					'</linearGradient><clipPath id="uc"><circle cx="32" cy="32" r="32"/></clipPath></defs>' +
					'<circle cx="32" cy="32" r="32" fill="url(#u)"/>' +
					'<g clip-path="url(#uc)">' +
					'<circle cx="32" cy="24" r="10.5" fill="#ffffff"/>' +
					'<path d="M32 38c10.2 0 17 6.2 17 14.6V64H15V52.6C15 44.2 21.8 38 32 38z" fill="#ffffff"/>' +
					"</g></svg>",
			);

		/** Built-in assistant avatar (brand-blue disc + sparkle). */
		const DEFAULT_AI =
			"data:image/svg+xml;charset=utf-8," +
			encodeURIComponent(
				'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
					'<defs><linearGradient id="a" x1="0" y1="0" x2="1" y2="1">' +
					'<stop offset="0" stop-color="#5b7bff"/><stop offset="1" stop-color="#2236b8"/>' +
					'</linearGradient><clipPath id="ac"><circle cx="32" cy="32" r="32"/></clipPath></defs>' +
					'<circle cx="32" cy="32" r="32" fill="url(#a)"/>' +
					'<g clip-path="url(#ac)">' +
					'<path d="M31 12l4.9 12.1L48 29l-12.1 4.9L31 46l-4.9-12.1L14 29l12.1-4.9z" fill="#ffffff"/>' +
					'<circle cx="46" cy="17" r="3.2" fill="#ffffff" fill-opacity="0.78"/>' +
					"</g></svg>",
			);

		/** 12px/18px copy for this plugin, picked from the browser language. */
		const ZH =
			typeof navigator === "object" && /^zh/i.test(String(navigator.language || "zh"));
		const TEXT = ZH
			? {
					navTitle: "消息头像",
					title: "消息头像",
					desc: "在用户和 AI 的消息旁显示圆形头像，类似聊天软件的气泡效果。",
					size: "头像大小",
					sizeDesc: "拖动调节头像直径（当前 {n}px）。",
					user: "我的头像",
					userDesc: "用于你发送的消息。",
					ai: "AI 头像",
					aiDesc: "用于 AI 回复的消息。",
					pick: "选择图片",
					reset: "恢复默认",
					on: "已开启",
					off: "已关闭",
					note: "图片只保存在本机浏览器中，不会上传。",
					badFile: "无法读取该图片，请换一张试试。",
				}
			: {
					navTitle: "Chat avatars",
					title: "Chat avatars",
					desc: "Show a round avatar beside every user and AI message, IM style.",
					size: "Avatar size",
					sizeDesc: "Drag to adjust the avatar diameter (currently {n}px).",
					user: "My avatar",
					userDesc: "Shown on messages you send.",
					ai: "AI avatar",
					aiDesc: "Shown on messages the AI writes.",
					pick: "Choose image",
					reset: "Reset",
					on: "On",
					off: "Off",
					note: "Images stay in this browser; nothing is uploaded.",
					badFile: "That image could not be read; try another one.",
				};

		/** The style text is static; only the CSS variables below move. */
		const STYLE_TEXT = [
			/* Defaults; applyPrefs() overwrites the dynamic ones per user choice.
			   The two line variables mirror the shipped type scale: an answer body is
			   markdown base (`24px + delta`), a user bubble is `22px + delta` of text
			   inside 10px of its own top padding. */
			"html[data-dsh-chat-avatar]{--dsh-ca-size:32px;--dsh-ca-gap:10px;--dsh-ca-user:none;--dsh-ca-ai:none;" +
				"--dsh-ca-line-ai:calc(24px + var(--dsh-content-font-delta,0px));" +
				"--dsh-ca-line-user:calc(22px + var(--dsh-content-font-delta,0px))}",
			/* A row is a positioning context and reserves the face's height plus the room
			   the face needs above the first line, so `top` below can center it on that
			   line. Only the vertical axis grows; no text ever moves sideways. */
			'html[data-dsh-chat-avatar] [data-chat-flow-kind="assistant-step"]{--dsh-ca-pad:max(0px,calc((var(--dsh-ca-size) - var(--dsh-ca-line-ai)) * 0.5));position:relative;padding-top:var(--dsh-ca-pad);min-height:calc(var(--dsh-ca-size) + 2px)}',
			'html[data-dsh-chat-avatar] [data-chat-flow-kind="user"],',
			'html[data-dsh-chat-avatar] [data-chat-flow-kind="steering"]{--dsh-ca-pad:max(0px,calc((var(--dsh-ca-size) - var(--dsh-ca-line-user)) * 0.5 - 10px));position:relative;padding-top:var(--dsh-ca-pad);min-height:calc(var(--dsh-ca-size) + 2px)}',
			/* The avatar itself: a hard circle regardless of any inherited radius. */
			'html[data-dsh-chat-avatar] [data-chat-flow-kind="user"]::after,',
			'html[data-dsh-chat-avatar] [data-chat-flow-kind="steering"]::after,',
			'html[data-dsh-chat-avatar] [data-chat-flow-kind="assistant-step"]:not([data-chat-group-part="reasoning"])::before{content:"";position:absolute;width:var(--dsh-ca-size);height:var(--dsh-ca-size);border-radius:50%!important;clip-path:circle(50% at 50% 50%)!important;background-position:center;background-size:cover;background-repeat:no-repeat;pointer-events:none;z-index:1}',
			/* Gutter placement: AI on the left of the text, the user on the right of the
			   bubble, and in both cases the face is centered on the first text line. */
			'html[data-dsh-chat-avatar] [data-chat-flow-kind="user"]::after,',
			'html[data-dsh-chat-avatar] [data-chat-flow-kind="steering"]::after{right:calc(-1 * (var(--dsh-ca-size) + var(--dsh-ca-gap)));top:calc(var(--dsh-ca-pad) + 10px + (var(--dsh-ca-line-user) - var(--dsh-ca-size)) * 0.5);background-image:var(--dsh-ca-user)}',
			'html[data-dsh-chat-avatar] [data-chat-flow-kind="assistant-step"]:not([data-chat-group-part="reasoning"])::before{left:calc(-1 * (var(--dsh-ca-size) + var(--dsh-ca-gap)));top:calc(var(--dsh-ca-pad) + (var(--dsh-ca-line-ai) - var(--dsh-ca-size)) * 0.5);background-image:var(--dsh-ca-ai)}',
			/* Empty or folded rows must not paint a floating avatar nor reserve space. */
			'html[data-dsh-chat-avatar] [data-chat-flow-kind="assistant-step"]:has(>[data-slot="conversation.chat.node"]:empty)::before{display:none}',
			'html[data-dsh-chat-avatar] [data-chat-flow-kind="assistant-step"]:has(>[data-slot="conversation.chat.node"]:empty){min-height:0;padding-top:0}',
			/* A turn answers in several consecutive steps: one avatar per run, like an
			   IM message group, instead of a stack of identical faces. */
			'html[data-dsh-chat-avatar] [data-chat-flow-kind="assistant-step"]:not([hidden]):not([data-turn-process-hidden]):not([data-chat-group-part="reasoning"])+[data-chat-flow-kind="assistant-step"]:not([hidden]):not([data-turn-process-hidden])::before{display:none}',
			/* Narrow panes have no margin to borrow: reserve an in-row gutter instead so
			   nothing clips. The chat scroll is the nearest inline-size container. */
			"@container (max-width: 1100px){",
			'html[data-dsh-chat-avatar] [data-chat-flow-kind="user"],',
			'html[data-dsh-chat-avatar] [data-chat-flow-kind="steering"]{padding-right:calc(var(--dsh-ca-size) + var(--dsh-ca-gap))}',
			'html[data-dsh-chat-avatar] [data-chat-flow-kind="user"]::after,',
			'html[data-dsh-chat-avatar] [data-chat-flow-kind="steering"]::after{right:0}',
			'html[data-dsh-chat-avatar] [data-chat-flow-kind="assistant-step"]{padding-left:calc(var(--dsh-ca-size) + var(--dsh-ca-gap))}',
			'html[data-dsh-chat-avatar] [data-chat-flow-kind="assistant-step"]::before{left:0}',
			'html[data-dsh-chat-avatar] [data-chat-flow-kind="assistant-step"]:has(>[data-slot="conversation.chat.node"]:empty){padding-left:0}',
			"}",
			/* Settings page. */
			".dsh-ca_page{display:flex;flex-direction:column;width:100%}",
			".dsh-ca_row{display:flex;align-items:center;justify-content:space-between;gap:24px;padding:16px 0;border-bottom:.5px solid var(--dsw-alias-border-l2)}",
			".dsh-ca_row:last-of-type{border-bottom:none}",
			".dsh-ca_head{display:flex;align-items:center;gap:12px;min-width:0}",
			".dsh-ca_avatar{width:44px;height:44px;border-radius:50%!important;clip-path:circle(50% at 50% 50%)!important;flex:none;background-size:cover;background-position:center;background-repeat:no-repeat}",
			".dsh-ca_title{font-size:14px;line-height:20px;color:var(--dsw-alias-label-primary)}",
			".dsh-ca_desc{margin-top:4px;font-size:12px;line-height:18px;color:var(--dsw-alias-label-secondary)}",
			".dsh-ca_actions{display:flex;gap:8px;flex:none}",
			".dsh-ca_btn{font:inherit;font-size:12px;line-height:18px;padding:5px 10px;border-radius:6px;border:1px solid var(--dsw-alias-border-l2);background:transparent;color:var(--dsw-alias-label-primary);cursor:pointer}",
			".dsh-ca_btn:hover{background:var(--dsw-alias-bg-layer-2)}",
			".dsh-ca_switch{font:inherit;font-size:12px;line-height:18px;min-width:56px;padding:5px 12px;border-radius:999px;border:1px solid var(--dsw-alias-border-l2);background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer;flex:none}",
			".dsh-ca_switch[data-on]{background:var(--dsw-alias-brand-primary);border-color:var(--dsw-alias-brand-primary);color:#fff}",
			".dsh-ca_range{width:180px;accent-color:var(--dsw-alias-brand-primary);flex:none}",
			".dsh-ca_note{font-size:12px;line-height:18px;color:var(--dsw-alias-label-secondary);padding-top:16px}",
			".dsh-ca_error{font-size:12px;line-height:18px;color:var(--dsw-alias-state-error-primary);padding-top:8px}",
		].join("\n");

		//#region preferences
		const DEFAULTS = Object.freeze({ enabled: true, size: DEFAULT_SIZE, user: "", ai: "" });
		const listeners = new Set();
		let prefs = readPrefs();

		/** Clamp one incoming size into the supported range. @param value - raw value. @returns a usable pixel size. */
		function clampSize(value) {
			const number = Math.round(Number(value));
			if (!Number.isFinite(number)) return DEFAULT_SIZE;
			return Math.min(MAX_SIZE, Math.max(MIN_SIZE, number));
		}

		/** Read the stored preferences, falling back to defaults. @returns the live preference record. */
		function readPrefs() {
			try {
				const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
				if (!raw) return { ...DEFAULTS };
				const parsed = JSON.parse(raw);
				if (typeof parsed !== "object" || parsed === null) return { ...DEFAULTS };
				return {
					enabled: parsed.enabled !== false,
					size: clampSize(parsed.size),
					user: typeof parsed.user === "string" ? parsed.user : "",
					ai: typeof parsed.ai === "string" ? parsed.ai : "",
				};
			} catch {
				return { ...DEFAULTS };
			}
		}

		/** Push the live preferences into the document as CSS variables. */
		function applyPrefs() {
			const root = document.documentElement;
			if (!root) return;
			if (!prefs.enabled) {
				root.removeAttribute("data-dsh-chat-avatar");
				return;
			}
			root.setAttribute("data-dsh-chat-avatar", "");
			root.style.setProperty("--dsh-ca-size", `${prefs.size}px`);
			root.style.setProperty("--dsh-ca-gap", `${Math.max(6, Math.round(prefs.size * 0.34))}px`);
			root.style.setProperty("--dsh-ca-user", cssUrl(prefs.user || DEFAULT_USER));
			root.style.setProperty("--dsh-ca-ai", cssUrl(prefs.ai || DEFAULT_AI));
		}

		/** Wrap one image source in a quoted CSS `url()`. @param source - data URL. @returns the CSS value. */
		function cssUrl(source) {
			return `url("${source.replace(/["\\]/g, "\\$&")}")`;
		}

		/** Merge and persist a preference patch, then repaint every open view. @param patch - changed fields. */
		function updatePrefs(patch) {
			prefs = { ...prefs, ...patch };
			prefs.size = clampSize(prefs.size);
			try {
				globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(prefs));
			} catch {
				/* A full or blocked store only costs persistence, never the feature. */
			}
			applyPrefs();
			for (const listener of listeners) {
				try {
					listener();
				} catch {
					/* One broken subscriber must not stop the others. */
				}
			}
		}

		/** Subscribe to preference changes. @param listener - called after every write. @returns its disposer. */
		function subscribe(listener) {
			listeners.add(listener);
			return () => listeners.delete(listener);
		}
		//#endregion

		//#region stylesheet
		/** Install the stylesheet once per page. */
		function injectStyle() {
			const selector = `style[data-plugin-css=${JSON.stringify(STYLE_KEY)}]`;
			if (document.querySelector(selector) !== null) return;
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-chat-avatar";
			tag.dataset.pluginCss = STYLE_KEY;
			tag.textContent = STYLE_TEXT;
			document.head.appendChild(tag);
		}
		//#endregion

		//#region image picking
		/**
		 * Downscale one picked image into a square data URL, so the stored avatar
		 * stays small enough for `localStorage` no matter how big the source is.
		 *
		 * The alpha channel is masked to a circle: the stored picture is already
		 * round, so the avatar cannot be reshaped by a page-wide corner rule.
		 *
		 * @param file - the picked file.
		 * @returns a round square PNG data URL.
		 */
		async function squareDataUrl(file) {
			const url = URL.createObjectURL(file);
			try {
				const image = await new Promise((resolve, reject) => {
					const element = new Image();
					element.onload = () => resolve(element);
					element.onerror = () => reject(new Error("decode failed"));
					element.src = url;
				});
				const side = 128;
				const canvas = document.createElement("canvas");
				canvas.width = side;
				canvas.height = side;
				const context = canvas.getContext("2d");
				if (context === null) throw new Error("no 2d context");
				context.save();
				context.beginPath();
				context.arc(side / 2, side / 2, side / 2, 0, Math.PI * 2);
				context.closePath();
				context.clip();
				const scale = Math.max(side / image.width, side / image.height);
				const width = image.width * scale;
				const height = image.height * scale;
				context.drawImage(image, (side - width) / 2, (side - height) / 2, width, height);
				context.restore();
				return canvas.toDataURL("image/png");
			} finally {
				URL.revokeObjectURL(url);
			}
		}
		//#endregion

		//#region settings page
		/**
		 * One avatar row: preview, picker, and reset.
		 *
		 * @param props - the row copy, current source, and the writer.
		 * @returns the settings row.
		 */
		function AvatarRow({ title, desc, source, onPick, onReset }) {
			const input = React.useRef(null);
			return h(
				"div",
				{ className: "dsh-ca_row" },
				h(
					"div",
					{ className: "dsh-ca_head" },
					h("div", { className: "dsh-ca_avatar", style: { backgroundImage: cssUrl(source) } }),
					h(
						"div",
						null,
						h("div", { className: "dsh-ca_title" }, title),
						h("div", { className: "dsh-ca_desc" }, desc),
					),
				),
				h(
					"div",
					{ className: "dsh-ca_actions" },
					h("input", {
						ref: input,
						type: "file",
						accept: "image/*",
						style: { display: "none" },
						onChange: (event) => {
							const file = event.target.files?.[0];
							event.target.value = "";
							if (file !== undefined) onPick(file);
						},
					}),
					h(
						"button",
						{ type: "button", className: "dsh-ca_btn", onClick: () => input.current?.click() },
						TEXT.pick,
					),
					h("button", { type: "button", className: "dsh-ca_btn", onClick: onReset }, TEXT.reset),
				),
			);
		}

		/**
		 * The settings page: enable switch, size slider, and the two avatar rows.
		 *
		 * @returns the settings section body.
		 */
		function ChatAvatarSection() {
			const [state, setState] = React.useState(prefs);
			const [error, setError] = React.useState("");
			React.useEffect(() => subscribe(() => setState(prefs)), []);

			/** Decode, downscale, and store one picked file. @param key - preference field. @param file - picked file. */
			const pick = (key) => (file) => {
				void squareDataUrl(file)
					.then((dataUrl) => {
						setError("");
						updatePrefs({ [key]: dataUrl });
					})
					.catch(() => setError(TEXT.badFile));
			};

			return h(
				"div",
				{ className: "dsh-ca_page" },
				h(
					"div",
					{ className: "dsh-ca_row" },
					h(
						"div",
						null,
						h("div", { className: "dsh-ca_title" }, TEXT.title),
						h("div", { className: "dsh-ca_desc" }, TEXT.desc),
					),
					h(
						"button",
						{
							type: "button",
							className: "dsh-ca_switch",
							"data-on": state.enabled ? "" : undefined,
							"aria-pressed": state.enabled,
							onClick: () => updatePrefs({ enabled: !state.enabled }),
						},
						state.enabled ? TEXT.on : TEXT.off,
					),
				),
				h(
					"div",
					{ className: "dsh-ca_row" },
					h(
						"div",
						null,
						h("div", { className: "dsh-ca_title" }, TEXT.size),
						h("div", { className: "dsh-ca_desc" }, TEXT.sizeDesc.replace("{n}", String(state.size))),
					),
					h("input", {
						type: "range",
						className: "dsh-ca_range",
						min: MIN_SIZE,
						max: MAX_SIZE,
						step: 2,
						value: state.size,
						"aria-label": TEXT.size,
						onChange: (event) => updatePrefs({ size: Number(event.target.value) }),
					}),
				),
				h(AvatarRow, {
					title: TEXT.user,
					desc: TEXT.userDesc,
					source: state.user || DEFAULT_USER,
					onPick: pick("user"),
					onReset: () => updatePrefs({ user: "" }),
				}),
				h(AvatarRow, {
					title: TEXT.ai,
					desc: TEXT.aiDesc,
					source: state.ai || DEFAULT_AI,
					onPick: pick("ai"),
					onReset: () => updatePrefs({ ai: "" }),
				}),
				error === "" ? null : h("div", { className: "dsh-ca_error" }, error),
				h("div", { className: "dsh-ca_note" }, TEXT.note),
			);
		}
		//#endregion

		/**
		 * Client plugin body.
		 *
		 * @param ctx - the client context (`slots`).
		 */
		function apply(ctx) {
			try {
				injectStyle();
				applyPrefs();
			} catch (error) {
				console.warn("[dsh-chat-avatar] could not install the avatar stylesheet", error);
			}
			try {
				ctx.slots.inject("settings.section", () =>
					ctx.slots.register(
						{
							name: "settings.section",
							id: "chat-avatar",
							order: 120,
							label: () => TEXT.navTitle,
						},
						ChatAvatarSection,
					),
				);
			} catch (error) {
				console.warn("[dsh-chat-avatar] could not register the settings page", error);
			}
		}

		const inject = ["slots"];

		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	},
});
