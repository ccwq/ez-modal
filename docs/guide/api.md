# API 文档

## EZModal Props

| 名称 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `modelValue` | `boolean` | `false` | `v-model` 显隐 |
| `title` | `string` | `'EZModal的标题'` | 标题文本 |
| `showCloseButton` | `boolean` | `true` | 显示关闭按钮 |
| `closeOnEsc` | `boolean` | `true` | 是否支持 ESC 关闭 |
| `closeOnClickMask` | `boolean` | `true` | 是否支持点击遮罩关闭 |
| `lockScroll` | `boolean` | `true` | 打开时锁定 body 滚动 |
| `beforeClose` | `(reason) => boolean \| Promise<boolean> \| void` | `undefined` | 关闭前拦截 |
| `appendTo` | `string \| false` | `'body'` | Teleport 目标，`false` 表示禁用 |
| `width` | `string \| number` | `'50%'` | 弹窗宽度 |
| `maxWidth` | `string \| number \| undefined` | `undefined` | 弹窗最大宽度 |
| `fullscreen` | `boolean` | `false` | 全屏模式 |
| `showMask` | `boolean` | `true` | 是否显示遮罩 |
| `maskOpacity` | `number` | `0.4` | 遮罩透明度（0-1） |
| `destroyOnClose` | `boolean` | `false` | 关闭后是否销毁内容 |
| `customClass` | `string` | `''` | 面板自定义类名 |
| `zIndex` | `number \| undefined` | `undefined` | 弹层 z-index |
| `centered` | `boolean` | `false` | 是否居中 |
| `draggable` | `boolean` | `false` | 是否支持拖动 |

## EZModal Emits

| 事件名 | 参数 | 说明 |
| --- | --- | --- |
| `update:modelValue` | `(value: boolean)` | 更新显示状态 |
| `open` | `()` | 打开前触发 |
| `opened` | `()` | 打开动画完成后触发 |
| `close` | `()` | 请求关闭时触发 |
| `closed` | `()` | 关闭动画完成后触发 |

## EZModal Slots

| 插槽名 | 参数 | 说明 |
| --- | --- | --- |
| `default` | - | 弹窗正文内容 |
| `title` | - | 自定义标题区域 |
| `footer` | - | 自定义底部区域 |

## EZModal Expose

| 方法名 | 签名 | 说明 |
| --- | --- | --- |
| `open` | `() => void` | 打开弹窗 |
| `close` | `() => void` | 请求关闭弹窗 |
| `toggle` | `() => void` | 切换开关 |
