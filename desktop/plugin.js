import { atom, Button, Input, ListRow, SegmentedControl, ToggleRow, useValue } from '@hermes/plugin-sdk'
import { useEffect, useId, useState } from 'react'
import { jsx, jsxs } from 'react/jsx-runtime'

const STYLE_ID = 'hermes-own-message-blue'
const NAME = '本人消息 · Hermes 蓝'
const STICKY_KEY = 'sticky-latest-message'
const LOOK_KEY = 'appearance'
const DEFAULT_LOOK = { background: '#0053FD', foreground: '#FFFFFF', shape: 'classic' }
// Each column pairs a light fill with a stronger shade of the same hue.
const COLOR_PRESETS = [
  ['白色', '#FFFFFF'], ['浅灰', '#F2F2F2'], ['浅蓝', '#DDEBF7'], ['浅绿', '#C6EFCE'],
  ['浅黄', '#FFEB9C'], ['浅橙', '#FCE4D6'], ['浅红', '#FFC7CE'], ['浅紫', '#E4DFEC'],
  ['黑色', '#000000'], ['深灰', '#595959'], ['Hermes 蓝', DEFAULT_LOOK.background], ['深绿', '#006100'],
  ['棕黄', '#9C5700'], ['深橙', '#C65911'], ['深红', '#9C0006'], ['紫色', '#7030A0']
]
const SHAPES = [
  { id: 'classic', label: '经典聊天' },
  { id: 'rounded', label: '柔和圆角' },
  { id: 'native', label: 'Hermes 原生' }
]
const LEGACY_STICKY_STORAGE = 'hermes.plugin.hermes-message-scroll.sticky-latest-message'
const FLOW_MARKER = 'data-hermes-own-message-blue-flow'
const FLOW_TRANSCRIPT = `:root[${FLOW_MARKER}] [data-slot="aui_thread-viewport"]:not([data-hud-shell] *)`
const ROOM_USER_ROW = '[data-room-message="user"]'
const ROOM_BODY = ':scope > div > [data-selectable-text="true"]'
const OWN_MARKER = 'data-hermes-own-message-blue'
const THREAD_ACTIONS = '[data-slot="aui_user-message-root"][data-message-id]:not([data-hud-shell] *) [data-slot="aui_user-bubble-actions"]'
const THREAD_BUBBLE = `${THREAD_ACTIONS} .composer-human-message`
const ROOM_BUBBLE = `${ROOM_USER_ROW}[${OWN_MARKER}] > div > [data-selectable-text="true"]`

const FILL = 'var(--hermes-own-message-fill)'
const INK = 'var(--hermes-own-message-ink)'
const PREVIEW = '.hermes-own-message-preview'
const css = `
@media (forced-colors: none) {
  ${THREAD_ACTIONS}, ${ROOM_BUBBLE} {
    --dt-user-bubble: ${FILL};
  }

  :is(${THREAD_BUBBLE}, ${ROOM_BUBBLE}, ${PREVIEW}) {
    background-color: ${FILL};
    color: ${INK};
  }

  ${ROOM_BUBBLE} .aui-md {
    --foreground: ${INK};
    --dt-foreground: ${INK};
    --muted-foreground: ${INK};
    --dt-muted-foreground: ${INK};
    --tw-prose-body: ${INK};
    color: ${INK};
  }

  :is(${THREAD_BUBBLE}, ${ROOM_BUBBLE}) :is(a, .ref) {
    color: ${INK};
  }
  :is(${THREAD_BUBBLE}, ${ROOM_BUBBLE}) a {
    text-decoration: underline;
  }

  ${THREAD_ACTIONS} > .human-message-with-todos-wrapper [class~="bg-(--dt-user-bubble)"]:not(.composer-human-message) {
    --ui-text-secondary: ${INK};
    --ui-text-tertiary: ${INK};
    --ui-text-quaternary: ${INK};
    --dt-foreground: ${INK};
    --dt-muted-foreground: ${INK};
    --ui-control-active-background: color-mix(in srgb, ${INK} 16%, transparent);
  }
}

.hermes-own-color-tools { display: grid; gap: .55rem; width: 14rem; max-width: 100%; min-width: 0; }
.hermes-own-presets { display: grid; grid-template-columns: repeat(8, minmax(0, 1fr)); gap: .3rem; }
.hermes-own-presets input[type=radio] {
  appearance: none; display: grid; place-items: center; width: 100%; height: 1.55rem; margin: 0;
  border-radius: .24rem; border: 1px solid color-mix(in srgb, var(--foreground) 22%, transparent);
  cursor: pointer; forced-color-adjust: none;
}
.hermes-own-presets input:checked { box-shadow: 0 0 0 1px var(--background), 0 0 0 2px var(--foreground); }
.hermes-own-presets input:checked::after {
  content: ''; width: .55rem; height: .55rem; border-radius: 50%;
  border: 2px solid var(--background); background: var(--foreground);
}
.hermes-own-presets input:focus-visible { outline: 2px dashed var(--foreground); outline-offset: 2px; }
.hermes-own-color-fields { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: .25rem; }
.hermes-own-color-fields label { display: inline-flex; align-items: center; gap: .35rem; font-size: .75rem; cursor: pointer; }
.hermes-own-color-fields input[type=color] {
  width: 2rem; height: 1.8rem; padding: 2px; border: 1px solid var(--border);
  border-radius: .4rem; background: var(--background); cursor: pointer;
}
.hermes-own-color-fields input[type=color]::-webkit-color-swatch-wrapper { padding: 1px; }
.hermes-own-color-fields input[type=color]::-webkit-color-swatch { border: none; border-radius: .2rem; }
.hermes-own-color-fields input[type=text] { width: 7.2rem; font-family: var(--font-mono, monospace); }
.hermes-own-preview-frame {
  display: flex; margin-top: .5rem; padding: .8rem; border-radius: .65rem;
  background: var(--ui-bg-tertiary); border: 1px solid var(--ui-stroke-tertiary);
}
${PREVIEW} { width: 100%; min-width: 0; padding: .45rem .8rem; border-radius: var(--radius-xl, .75rem); overflow-wrap: anywhere; }

${FLOW_TRANSCRIPT} [data-slot="aui_user-message-root"].sticky {
  position: relative;
  top: auto;
  z-index: auto;
}

/* The native sticky prompt also masks adjacent content while scrolling. */
${FLOW_TRANSCRIPT} [data-sticky-prompt-clip] {
  clip-path: none;
}
`

function chatShapeCss(shape) {
  if (shape === 'native') return ''
  const row = `${ROOM_USER_ROW}[${OWN_MARKER}]`
  const header = `${row} > div:has(> [data-selectable-text="true"]) > div:first-child`
  const radius = shape === 'classic' ? '16px 16px 4px 16px' : '20px'
  return `
    /* Size the action container with the bubble so native hover controls stay attached. */
    ${THREAD_ACTIONS} {
      width: fit-content; min-width: min(6rem, 88%); max-width: 88%; margin-left: auto;
    }
    :is(${THREAD_BUBBLE}, ${ROOM_BUBBLE}, ${PREVIEW}) { border-radius: ${radius}; }
    ${row} { flex-direction: row-reverse; }
    ${header} { justify-content: flex-end; }
    ${header} > .ml-auto { order: -1; margin-left: 0; margin-right: auto; }
    ${ROOM_BUBBLE}, ${PREVIEW} { width: fit-content; max-width: 88%; margin-left: auto; }
  `
}

function normalizeHex(raw) {
  if (typeof raw !== 'string') return null
  const value = raw.trim()
  return /^#?[0-9a-f]{6}$/i.test(value) ? '#' + value.replace(/^#/, '').toUpperCase() : null
}

function readLook(storage) {
  const saved = storage.get(LOOK_KEY, null)
  return {
    background: normalizeHex(saved?.background) ?? DEFAULT_LOOK.background,
    foreground: normalizeHex(saved?.foreground) ?? DEFAULT_LOOK.foreground,
    shape: SHAPES.some(option => option.id === saved?.shape) ? saved.shape : DEFAULT_LOOK.shape
  }
}

function ColorRow({ label, value, onChange, resetVersion }) {
  const id = useId()
  const [draft, setDraft] = useState(value)
  const [invalid, setInvalid] = useState(false)
  useEffect(() => {
    setDraft(value)
    setInvalid(false)
  }, [value, resetVersion])
  const accept = raw => {
    const next = normalizeHex(raw)
    setInvalid(!next)
    if (next) {
      setDraft(next)
      if (next !== value) onChange(next)
    }
  }
  return jsx(ListRow, {
    title: jsx('label', { htmlFor: id, children: label }),
    action: jsxs('div', { className: 'hermes-own-color-tools', children: [
      jsx('div', {
        role: 'radiogroup', 'aria-label': label + '常用色', className: 'hermes-own-presets',
        children: COLOR_PRESETS.map(([name, hex]) => jsx('input', {
          type: 'radio', name: id + '-preset', 'aria-label': name, title: `${name} ${hex}`,
          value: hex, checked: value === hex, style: { backgroundColor: hex },
          onChange: () => accept(hex),
          // Re-selecting the active swatch also discards a partial HEX draft.
          onClick: () => { if (value === hex) accept(hex) }
        }, hex))
      }),
      jsxs('div', { className: 'hermes-own-color-fields', children: [
        jsxs('label', { children: [
          jsx('input', { type: 'color', 'aria-label': '选择' + label, title: '选择' + label, value,
            onChange: event => accept(event.currentTarget.value) }),
          jsx('span', { children: '自定义色盘' })
        ] }),
        jsx(Input, { id, 'aria-label': label + ' HEX', 'aria-invalid': invalid,
          'aria-describedby': invalid ? id + '-error' : undefined, type: 'text', size: 'sm', value: draft,
          onChange: event => { setDraft(event.currentTarget.value); setInvalid(false) },
          onBlur: event => accept(event.currentTarget.value),
          onKeyDown: event => {
            if (event.key === 'Enter') { event.preventDefault(); accept(event.currentTarget.value) }
            if (event.key === 'Escape') { event.stopPropagation(); setDraft(value); setInvalid(false) }
          } })
      ] }),
      invalid && jsx('p', { id: id + '-error', role: 'status', className: 'text-xs text-destructive', children: '请输入六位 HEX 色值，如 #0053FD。' })
    ] })
  })
}

function initialStickyPreference(storage) {
  const saved = storage.get(STICKY_KEY, null)
  if (typeof saved === 'boolean') return saved

  // Import the one preference written by the retired local scroll plugin.
  let previous = null
  try {
    previous = window.localStorage.getItem(LEGACY_STICKY_STORAGE)
  } catch {
    return false
  }
  if (previous !== 'true' && previous !== 'false') return false

  const sticky = previous === 'true'
  storage.set(STICKY_KEY, sticky)
  return sticky
}

function markRoomRow(row) {
  const body = row.querySelector(ROOM_BODY)
  if (!body) {
    row.removeAttribute(OWN_MARKER)
    return
  }

  // The legacy room renders this slot only for its own user under a user row.
  // The gateway room uses the same user row for other humans and scheduled posts.
  if (body.querySelector(':scope > [data-slot="group-chat-message-content"]')) {
    row.setAttribute(OWN_MARKER, '')
    return
  }

  // This build has no authorship attribute on canonical rows. Inspect only
  // the rendered body's EventBody prop, with the same predicate as its “You”
  // label. If a build changes these props, fail closed instead of guessing
  // from the text or localized display name.
  const reactProps = Object.keys(body).find(key => key.startsWith('__reactProps$'))
  const children = reactProps ? body[reactProps]?.children : undefined
  const event = Array.isArray(children) ? children[0]?.props?.event : undefined
  const actor = event?.actor
  const own = event?.kind === 'message.user' && actor?.kind === 'user' && actor.id === 'desktop' && !actor.display_name
  row.toggleAttribute(OWN_MARKER, own)
}

function markAddedRows(node) {
  if (node.nodeType !== Node.ELEMENT_NODE) return
  if (node.matches(ROOM_USER_ROW)) markRoomRow(node)
  node.querySelectorAll(ROOM_USER_ROW).forEach(markRoomRow)
}

export default {
  id: STYLE_ID,
  name: NAME,
  description: '自定义单聊和群聊中本人消息的背景色、文字颜色和气泡样式，可设置最后一条消息吸顶。',
  register(ctx) {
    const sticky = atom(initialStickyPreference(ctx.storage))
    const look = atom(readLook(ctx.storage))
    function updateLook(change) {
      const next = { ...readLook(ctx.storage), ...change }
      ctx.storage.set(LOOK_KEY, next)
      look.set(next)
    }
    const root = document.documentElement
    const stopApplying = sticky.subscribe(on => root.toggleAttribute(FLOW_MARKER, !on))
    const style = document.createElement('style')
    style.id = STYLE_ID
    const stopPainting = look.subscribe(({ background, foreground, shape }) => {
      style.textContent = `:root { --hermes-own-message-fill: ${background}; --hermes-own-message-ink: ${foreground}; }\n` + css + chatShapeCss(shape)
    })
    document.head.append(style)
    document.querySelectorAll(ROOM_USER_ROW).forEach(markRoomRow)

    const observer = new MutationObserver(records => {
      for (const { target, addedNodes } of records) {
        if (!addedNodes.length) continue
        const row = target instanceof Element && target.closest(ROOM_USER_ROW)
        if (row) markRoomRow(row)
        addedNodes.forEach(markAddedRows)
      }
    })
    observer.observe(document.body, { childList: true, subtree: true })
    ctx.onDispose(() => {
      observer.disconnect()
      stopPainting()
      stopApplying()
      root.removeAttribute(FLOW_MARKER)
      style.remove()
      document.querySelectorAll(`[${OWN_MARKER}]`).forEach(row => row.removeAttribute(OWN_MARKER))
    })

    ctx.addEventListener(window, 'storage', event => {
      if (event.key === `hermes.plugin.${STYLE_ID}.${LOOK_KEY}` || event.key === null) {
        look.set(readLook(ctx.storage))
      }
      if (event.key === `hermes.plugin.${STYLE_ID}.${STICKY_KEY}` || event.key === null) {
        sticky.set(ctx.storage.get(STICKY_KEY, false) === true)
      }
    })

    ctx.registerSettingsPage({
      id: 'settings',
      title: NAME,
      render: function MessageSettings() {
        const checked = useValue(sticky)
        const values = useValue(look)
        const [resetVersion, setResetVersion] = useState(0)
        const resetAppearance = () => {
          updateLook(DEFAULT_LOOK)
          setResetVersion(version => version + 1)
        }
        return jsxs('div', { children: [
          jsx(ListRow, { title: '消息预览', wide: true,
            action: jsx(Button, { type: 'button', size: 'sm', variant: 'outline',
              onClick: resetAppearance, children: '恢复默认外观' }),
            below: jsx('div', { className: 'hermes-own-preview-frame', children: jsx('div', {
              className: 'hermes-own-message-preview', 'aria-label': '本人消息预览', children: '收到，周五见。'
            }) }) }),
          jsx(ColorRow, { label: '背景色', value: values.background, resetVersion, onChange: background => updateLook({ background }) }),
          jsx(ColorRow, { label: '文字颜色', value: values.foreground, resetVersion, onChange: foreground => updateLook({ foreground }) }),
          jsx(ListRow, { title: '气泡样式', action: jsx('div', {
            role: 'group', 'aria-label': '气泡样式', children: jsx(SegmentedControl, {
              options: SHAPES, value: values.shape, onChange: shape => updateLook({ shape })
            })
          }) }),
          jsx(ToggleRow, {
            checked,
            label: '最后一条消息吸顶',
            description: '开启后，查看长回复时，最后一条本人消息停留在会话顶部。关闭后，本人消息随列表滚动。',
            onChange: on => { ctx.storage.set(STICKY_KEY, on); sticky.set(on) }
          })
        ] })
      }
    })
  },
}
