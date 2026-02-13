# EZModal 组件说明

`EZModal` 是一个基于 Vue 3 + TSX 的通用弹窗组件，支持组件直用与 `useEZModal` 程序化调用两种方式。

当前能力包含：

- `v-model` 显隐控制
- `default / title / footer` 插槽
- `beforeClose` 关闭拦截
- `ESC`、遮罩点击关闭
- `appendTo` 控制 Teleport（`false` 时原地渲染）
- `destroyOnClose` 销毁策略
- `draggable` 拖动（按住头部）
- 在缩放容器（`transform: scale(...)`）内的拖动位移补偿

## 1. 基础使用

```vue
<template>
  <EZModal v-model="visible" title="查看通知" :width="660">
    <template #default>
      <p>这是弹窗内容</p>
    </template>

    <template #footer>
      <button @click="visible = false">关闭</button>
    </template>
  </EZModal>
</template>

<script setup lang="ts">
  import { ref } from 'vue'
  import EZModal from '@/components/model/EZModal'

  const visible = ref(false)
</script>
```

## 2. useEZModal（in-tree 模式）

适合弹窗跟随当前组件树渲染（例如在局部容器中展示）。

```vue
<template lang="pug">
.message-icon
  EZModalComponent(width="660px")
    span 这是弹窗内容

  button(@click="openEZModal()") 打开弹窗
</template>

<script setup lang="ts">
  import { useEZModal } from '@/components/model/EZModal'

  const {
    openModal: openEZModal,
    closeModal: closeEZModal,
    EZModalComponent,
  } = useEZModal({
    global: false,
    ezModalProps: {
      title: '查看通知',
      appendTo: false,
      draggable: true,
    },
  })
</script>
```

说明：

- in-tree 模式下，外部 `slots` 优先于 hook 内部 `content`。
- 若外部 `default` 插槽为空，会回退到 hook 的 `content`。

## 3. useEZModal（global 模式）

适合全局弹窗，首次打开时自动挂载到 `document.body`，后续复用同一实例。

```ts
import { useEZModal } from '@/components/model/EZModal'

const { openModal, closeModal } = useEZModal({
  global: true,
  content: <div>全局弹窗内容</div>,
  ezModalProps: {
    title: '全局通知',
    destroyOnClose: true,
  },
  slotFooter: () => <button onClick={() => closeModal()}>关闭</button>,
})

openModal({
  content: <div>运行时覆盖内容</div>,
  ezModalProps: { title: '运行时标题' },
})
```

## 4. 拖动设计说明（draggable）

- 打开 `draggable: true` 后，按住头部可拖动。
- 关闭按钮区域会被过滤，不触发拖动。
- `fullscreen: true` 时拖动自动禁用。
- 拖动位移施加在独立的拖动壳层（`EZModal__drag-shell`），避免与弹窗入场动画 `transform` 冲突。
- 在 `transform: scale(...)` 的父容器内，通过 `getBoundingClientRect() / offsetWidth|offsetHeight` 计算缩放比并补偿位移，保证拖动手感一致。

## 5. 关闭行为说明

- 关闭按钮、遮罩点击、ESC、`close()` 最终都走同一关闭管线。
- `beforeClose` 返回 `false` 会阻止关闭。

## 6. API 表格

### 6.1 EZModal Props

| 名称               | 类型                                              | 默认值            | 说明                                     |
| ------------------ | ------------------------------------------------- | ----------------- | ---------------------------------------- |
| `modelValue`       | `boolean`                                         | `false`           | `v-model` 显隐                           |
| `title`            | `string`                                          | `'EZModal的标题'` | 标题文本                                 |
| `showCloseButton`  | `boolean`                                         | `true`            | 显示关闭按钮                             |
| `closeOnEsc`       | `boolean`                                         | `true`            | 是否支持 ESC 关闭                        |
| `closeOnClickMask` | `boolean`                                         | `true`            | 是否支持点击遮罩关闭                     |
| `lockScroll`       | `boolean`                                         | `true`            | 打开时锁定 body 滚动                     |
| `beforeClose`      | `(reason) => boolean \| Promise<boolean> \| void` | `undefined`       | 关闭前拦截                               |
| `appendTo`         | `string \| false`                                 | `'body'`          | Teleport 目标，`false` 表示禁用 Teleport |
| `width`            | `string \| number`                                | `'50%'`           | 弹窗宽度                                 |
| `maxWidth`         | `string \| number \| undefined`                   | `undefined`       | 弹窗最大宽度                             |
| `fullscreen`       | `boolean`                                         | `false`           | 全屏模式                                 |
| `showMask`         | `boolean`                                         | `true`            | 是否显示遮罩                             |
| `maskOpacity`      | `number`                                          | `0.4`             | 遮罩透明度（0-1）                        |
| `destroyOnClose`   | `boolean`                                         | `false`           | 关闭后是否销毁内容                       |
| `customClass`      | `string`                                          | `''`              | 面板自定义类名                           |
| `zIndex`           | `number \| undefined`                             | `undefined`       | 层级，未设时内部默认 `1000`              |
| `centered`         | `boolean`                                         | `false`           | 是否居中                                 |
| `draggable`        | `boolean`                                         | `false`           | 是否支持拖动（头部拖拽）                 |

### 6.2 EZModal Emits

| 事件名              | 参数               | 说明               |
| ------------------- | ------------------ | ------------------ |
| `update:modelValue` | `(value: boolean)` | 更新显示状态       |
| `open`              | `()`               | 打开前触发         |
| `opened`            | `()`               | 打开动画完成后触发 |
| `close`             | `()`               | 请求关闭时触发     |
| `closed`            | `()`               | 关闭动画完成后触发 |

### 6.3 EZModal Slots

| 插槽名    | 参数 | 说明           |
| --------- | ---- | -------------- |
| `default` | -    | 弹窗正文内容   |
| `title`   | -    | 自定义标题区域 |
| `footer`  | -    | 自定义底部区域 |

### 6.4 EZModal Expose

| 方法名   | 签名         | 说明                       |
| -------- | ------------ | -------------------------- |
| `open`   | `() => void` | 打开弹窗                   |
| `close`  | `() => void` | 请求关闭弹窗（走关闭管线） |
| `toggle` | `() => void` | 切换开关                   |

### 6.5 useEZModal 选项（UseEZModalOptions）

| 选项           | 类型                                                                         | 默认值      | 说明                                  |
| -------------- | ---------------------------------------------------------------------------- | ----------- | ------------------------------------- |
| `global`       | `boolean`                                                                    | `false`     | `true` 全局模式；`false` in-tree 模式 |
| `content`      | `VNode \| VNode[] \| null`                                                   | `null`      | 初始正文内容                          |
| `ezModalProps` | `Partial<EZModalProps>`                                                      | `{}`        | 初始弹窗 props                        |
| `slotTitle`    | `(props: { title?: string }) => VNode \| VNode[] \| null`                    | `undefined` | 初始标题 slot                         |
| `slotFooter`   | `(props: { footer?: VNode \| VNode[] \| null }) => VNode \| VNode[] \| null` | `undefined` | 初始底部 slot                         |

### 6.6 openModal 参数（OpenModalPayload）

| 字段           | 类型                                                                         | 说明                |
| -------------- | ---------------------------------------------------------------------------- | ------------------- |
| `ezModalProps` | `Partial<EZModalProps>`                                                      | 运行时覆盖 props    |
| `content`      | `VNode \| VNode[] \| null`                                                   | 运行时覆盖正文      |
| `slotTitle`    | `(props: { title?: string }) => VNode \| VNode[] \| null`                    | 运行时覆盖标题 slot |
| `slotFooter`   | `(props: { footer?: VNode \| VNode[] \| null }) => VNode \| VNode[] \| null` | 运行时覆盖底部 slot |

### 6.7 useEZModal 返回值（当前实现）

| 字段               | 类型                                   | 说明                                          |
| ------------------ | -------------------------------------- | --------------------------------------------- |
| `EZModalComponent` | `Component`                            | in-tree 模式渲染组件（`global=false` 时使用） |
| `openModal`        | `(payload?: OpenModalPayload) => void` | 打开弹窗                                      |
| `closeModal`       | `() => void`                           | 关闭弹窗                                      |

> 说明：类型定义里声明了 `slotTitle/slotFooter` 返回项，但当前实现实际返回对象未包含这两个字段，使用时以本表“当前实现”为准。

## 7. 实践建议

- 需要跟随局部布局（如缩放容器）时，优先使用：`global: false + appendTo: false`。
- 需要全局单实例管理时，使用：`global: true`。
- 需要防止误关闭时，配置 `beforeClose`。
- 需要可拖拽交互时，启用 `draggable: true`，建议同时保留 `showMask: true`。
