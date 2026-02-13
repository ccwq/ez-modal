# 快速开始

## 安装

```bash
npm i ez-modal vue
```

## 组件方式

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

## useEZModal（in-tree）

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

## useEZModal（global）

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
