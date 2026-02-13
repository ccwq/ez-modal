/**
 * EZModal 弹窗组件
 *
 * 一个轻量级、可复用的弹窗/模态组件，支持：
 * - v-model 受控显示
 * - 标题/内容/底部 slots
 * - ESC 关闭、点击遮罩关闭、关闭前回调
 * - 滚动锁、焦点管理
 * - 生命周期事件
 *
 * @example
 * ```vue
 * <EZModal v-model="visible" title="标题">
 *   <template #default>
 *     <p>弹窗内容</p>
 *   </template>
 *   <template #footer>
 *     <button @click="visible = false">关闭</button>
 *   </template>
 * </EZModal>
 * ```
 */

/**
 * CSS 类名契约说明：
 * - .EZModal - 根容器
 * - .EZModal__mask - 遮罩层
 * - .EZModal__panel - 弹窗面板
 * - .EZModal__header - 头部区域
 * - .EZModal__title - 标题文本
 * - .EZModal__close-btn - 关闭按钮
 * - .EZModal__body - 内容区域
 * - .EZModal__footer - 底部区域
 */

import { useGradAlphaMask } from './hooks/useGradAlphaMask'
import {
  defineComponent,
  ref,
  computed,
  watch,
  nextTick,
  onMounted,
  onBeforeUnmount,
  Teleport,
  type PropType,
  type ExtractPropTypes,
  type VNode,
  type SetupContext,
} from 'vue'

// 样式使用原生 CSS 注入

/**
 * 关闭原因枚举
 */
type CloseReason = 'close-button' | 'mask' | 'esc' | 'method'

/**
 * beforeClose 钩子类型
 * 返回 false 阻止关闭，返回 true或不返回值允许关闭
 * 返回 Promise 时会等待 Promise resolve
 */
type BeforeCloseCallback = (reason: CloseReason) => boolean | Promise<boolean> | void

/**
 * 弹窗 Props
 */
export const ezModalProps = {
  /**
   * v-model 控制显示/隐藏
   */
  modelValue: {
    type: Boolean as PropType<boolean>,
    default: false,
    required: true,
  },

  /**
   * 标题
   */
  title: {
    type: String as PropType<string>,
    default: 'EZModal的标题',
  },

  /**
   * 是否显示关闭按钮
   */
  showCloseButton: {
    type: Boolean as PropType<boolean>,
    default: true,
  },

  /**
   * 是否启用 ESC 关闭
   */
  closeOnEsc: {
    type: Boolean as PropType<boolean>,
    default: true,
  },

  /**
   * 是否启用点击遮罩关闭
   */
  closeOnClickMask: {
    type: Boolean as PropType<boolean>,
    default: true,
  },

  /**
   * 是否锁定背景滚动
   */
  lockScroll: {
    type: Boolean as PropType<boolean>,
    default: true,
  },

  /**
   * 关闭前回调，可同步或异步返回 boolean 控制是否允许关闭
   */
  beforeClose: {
    type: Function as PropType<BeforeCloseCallback>,
    default: undefined,
  },

  /**
   * Teleport 目标容器，设置为 false 禁用 Teleport
   */
  appendTo: {
    type: [String, Boolean] as PropType<string | false>,
    default: 'body',
  },

  /**
   * 弹窗宽度，支持 CSS 单位
   */
  width: {
    type: [String, Number] as PropType<string | number>,
    default: '50%',
  },

  /**
   * 弹窗最大宽度
   */
  maxWidth: {
    type: [String, Number] as PropType<string | number>,
    default: undefined as string | number | undefined,
  },

  /**
   * 弹窗是否全屏显示
   */
  fullscreen: {
    type: Boolean as PropType<boolean>,
    default: false,
  },

  /**
   * 是否显示遮罩
   */
  showMask: {
    type: Boolean as PropType<boolean>,
    default: true,
  },

  /**
   * 遮罩层透明度 (0-1)
   */
  maskOpacity: {
    type: Number as PropType<number>,
    default: 0.4,
    validator: (val: number) => val >= 0 && val <= 1,
  },

  /**
   * 是否销毁弹窗关闭后的内容
   */
  destroyOnClose: {
    type: Boolean as PropType<boolean>,
    default: false,
  },

  /**
   * 自定义根元素类名
   */
  customClass: {
    type: String as PropType<string>,
    default: '',
  },

  /**
   * z-index 层级
   */
  zIndex: {
    type: Number as PropType<number>,
    default: undefined as number | undefined,
  },

  /**
   * 是否居中显示
   */
  centered: {
    type: Boolean as PropType<boolean>,
    default: false,
  },

  /**
   * 是否可拖动（按住头部拖动）
   */
  draggable: {
    type: Boolean as PropType<boolean>,
    default: false,
  },
}

export type EZModalProps = ExtractPropTypes<typeof ezModalProps>

/**
 * 弹窗组件
 */
export const EZModal = defineComponent({
  name: 'EZModal',
  props: ezModalProps,
  emits: [
    /**
     * v-model 更新事件
     * @param value 新的显示状态
     */
    'update:modelValue',
    /**
     * 打开前触发
     */
    'open',
    /**
     * 打开动画完成后触发
     */
    'opened',
    /**
     * 关闭前触发
     */
    'close',
    /**
     * 关闭动画完成后触发
     */
    'closed',
  ],
  // 支持的 slots：default（内容）、title（标题）、footer（页脚）
  // slots: default（内容）, title（标题）, footer（页脚）
  setup(props: EZModalProps, { slots, emit, expose }: SetupContext) {
    // ==================== 状态管理 ====================

    const visible = ref(props.modelValue)
    const bodyRef = ref<HTMLElement | null>(null)
    const dragShellRef = ref<HTMLElement | null>(null)
    const previousActiveElement = ref<HTMLElement | null>(null)
    const isEntering = ref(false)
    const isLeaving = ref(false)

    // ==================== 拖动状态 ====================

    const dragOffsetX = ref(0)
    const dragOffsetY = ref(0)
    const isDragging = ref(false)
    const dragStartClientX = ref(0)
    const dragStartClientY = ref(0)
    const dragStartOffsetX = ref(0)
    const dragStartOffsetY = ref(0)
    const dragScaleX = ref(1)
    const dragScaleY = ref(1)
    const isDraggable = computed(() => props.draggable && !props.fullscreen)

    let previousUserSelect = ''

    const getElementScale = (el: HTMLElement) => {
      const rect = el.getBoundingClientRect()
      const scaleX = el.offsetWidth > 0 ? rect.width / el.offsetWidth : 1
      const scaleY = el.offsetHeight > 0 ? rect.height / el.offsetHeight : 1

      return {
        scaleX: Number.isFinite(scaleX) && scaleX > 0 ? scaleX : 1,
        scaleY: Number.isFinite(scaleY) && scaleY > 0 ? scaleY : 1,
      }
    }

    const stopDragging = () => {
      if (!isDragging.value) return

      isDragging.value = false
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
      window.removeEventListener('pointercancel', handlePointerUp)
      document.body.style.userSelect = previousUserSelect
    }

    const handlePointerMove = (e: PointerEvent) => {
      if (!isDragging.value) return

      const deltaX = (e.clientX - dragStartClientX.value) / dragScaleX.value
      const deltaY = (e.clientY - dragStartClientY.value) / dragScaleY.value

      dragOffsetX.value = dragStartOffsetX.value + deltaX
      dragOffsetY.value = dragStartOffsetY.value + deltaY
    }

    const handlePointerUp = () => {
      stopDragging()
    }

    const handleHeaderPointerDown = (e: PointerEvent) => {
      if (!isDraggable.value) return
      if (e.button !== 0) return

      const target = e.target as HTMLElement | null
      if (target?.closest('.EZModal__close-btn')) {
        return
      }

      const shell = dragShellRef.value
      if (!shell) return

      const { scaleX, scaleY } = getElementScale(shell)
      dragScaleX.value = scaleX
      dragScaleY.value = scaleY

      dragStartClientX.value = e.clientX
      dragStartClientY.value = e.clientY
      dragStartOffsetX.value = dragOffsetX.value
      dragStartOffsetY.value = dragOffsetY.value

      previousUserSelect = document.body.style.userSelect
      document.body.style.userSelect = 'none'

      isDragging.value = true
      window.addEventListener('pointermove', handlePointerMove)
      window.addEventListener('pointerup', handlePointerUp)
      window.addEventListener('pointercancel', handlePointerUp)
    }

    // ==================== 计算属性 ====================

    const zIndexValue = computed(() => {
      if (props.zIndex !== undefined) {
        return props.zIndex
      }
      return 1000
    })

    const wrapperStyle = computed(() => {
      const style: Record<string, string | number> = {}
      style.zIndex = zIndexValue.value
      return style
    })

    const bodyStyle = computed(() => {
      const style: Record<string, string | number> = {}
      if (!props.fullscreen) {
        if (typeof props.width === 'number') {
          style.width = `${props.width}px`
        } else {
          style.width = props.width
        }
        if (props.maxWidth) {
          style.maxWidth =
            typeof props.maxWidth === 'number' ? `${props.maxWidth}px` : props.maxWidth
        }
      }
      return style
    })

    const maskStyle = computed(() => ({
      opacity: props.maskOpacity,
      zIndex: zIndexValue.value,
    }))

    const headerId = computed(() => `EZModal-header-${Math.random().toString(36).slice(2)}`)

    const shouldRender = computed(() => {
      if (destroyOnCloseMode.value) {
        return visible.value || isLeaving.value
      }
      return true
    })

    const destroyOnCloseMode = computed(() => props.destroyOnClose && !visible.value)

    const maskVisible = computed(() => visible.value || isLeaving.value)

    // ==================== 滚动锁控制 ====================

    let scrollLockTarget: HTMLElement | null = null

    const lockScroll = () => {
      if (!props.lockScroll) return

      scrollLockTarget = document.body
      const originalOverflow = document.body.style.overflow
      const originalPaddingRight = document.body.style.paddingRight

      document.body.style.overflow = 'hidden'

      // 补偿滚动条宽度
      const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth
      if (scrollBarWidth > 0) {
        document.body.style.paddingRight = `${scrollBarWidth}px`
      }
    }

    const unlockScroll = () => {
      if (!scrollLockTarget) return

      scrollLockTarget.style.overflow = ''
      scrollLockTarget.style.paddingRight = ''
      scrollLockTarget = null
    }

    // ==================== 焦点管理 ====================

    const saveFocus = () => {
      previousActiveElement.value = document.activeElement as HTMLElement
    }

    const restoreFocus = () => {
      nextTick(() => {
        if (previousActiveElement.value && previousActiveElement.value.isConnected) {
          try {
            previousActiveElement.value.focus()
          } catch (e) {
            // 元素可能已不可聚焦，忽略
          }
        }
        previousActiveElement.value = null
      })
    }

    // ==================== 关闭流程 ====================

    /**
     * 请求关闭弹窗
     * @param reason 关闭原因
     */
    const requestClose = async (reason: CloseReason) => {
      // 如果 beforeClose 返回 false，阻止关闭
      if (props.beforeClose) {
        const result = props.beforeClose(reason)

        if (result === false) {
          return
        }

        if (result instanceof Promise) {
          await result
          // 如果 Promise resolve 后 modelValue 仍然是 false，不做处理
          if (!props.modelValue) {
            return
          }
        }
      }

      // 触发 close 事件
      emit('close')

      // 更新 v-model
      emit('update:modelValue', false)
    }

    /**
     * 处理遮罩点击
     */
    const handleMaskClick = () => {
      if (props.closeOnClickMask) {
        requestClose('mask')
      }
    }

    /**
     * 处理关闭按钮点击
     */
    const handleCloseButtonClick = () => {
      requestClose('close-button')
    }

    /**
     * 处理 ESC 按键
     */
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && props.closeOnEsc && visible.value) {
        e.preventDefault()
        requestClose('esc')
      }
    }

    // ==================== 暴露方法 ====================

    const open = () => {
      emit('update:modelValue', true)
    }

    const close = () => {
      requestClose('method')
    }

    const toggle = () => {
      if (visible.value) {
        close()
      } else {
        open()
      }
    }

    expose({
      open,
      close,
      toggle,
    })

    // ==================== 生命周期监听 ====================

    // 监听 v-model 变化
    watch(
      () => props.modelValue,
      newVal => {
        if (newVal !== visible.value) {
          visible.value = newVal

          if (newVal) {

            // 打开时候重置拖拽偏移
            dragOffsetY.value = 0
            dragOffsetX.value = 0

            // 打开
            saveFocus()
            emit('open')
            nextTick(() => {
              lockScroll()
              emit('opened')
            })
          } else {
            // 关闭
            stopDragging()
            unlockScroll()
            restoreFocus()
          }
        }
      },
      { immediate: true }
    )

    // ==================== 事件监听 ====================

    onMounted(() => {
      document.addEventListener('keydown', handleKeydown)
    })

    onBeforeUnmount(() => {
      stopDragging()
      document.removeEventListener('keydown', handleKeydown)
      unlockScroll()
      restoreFocus()
    })

    // ==================== 渲染函数 ====================

    const renderDefaultSlot = (): VNode | VNode[] | null => {
      let content
      if (!slots.default) {
        content = 'EZModal的内容'
      } else {
        content = slots.default()
      }
      return <div class="EZModal__body">{content}</div>
    }

    const renderHeaderSlot = (): VNode | VNode[] | null => {
      if (slots.title) {
        return slots.title()
      }
      if (props.title) {
        return <span class="EZModal__title">{props.title}</span>
      }
      return null
    }

    const renderFooterSlot = (): VNode | VNode[] | null => {
      if (!slots.footer) return null
      return <div class="EZModal__footer">{slots.footer()}</div>
    }

    const renderPanel = () => {
      const closeButton = props.showCloseButton ? (
        <button class="EZModal__close-btn" onClick={handleCloseButtonClick} aria-label="关闭弹窗">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
          </svg>
        </button>
      ) : null

      const header = (
        <div
          class={['EZModal__header', { 'EZModal__header--draggable': isDraggable.value }]}
          id={headerId.value}
          onPointerdown={handleHeaderPointerDown}
        >
          {renderHeaderSlot()}
          {closeButton}
        </div>
      )

      const body = renderDefaultSlot()
      const footer = renderFooterSlot()

      const panelContent = (
        <div
          class={['EZModal__panel', props.customClass]}
          style={wrapperStyle.value}
          role="dialog"
          aria-modal="true"
          aria-labelledby={props.title || slots.title ? headerId.value : undefined}
        >
          {props.showMask && (
            <div
              class="EZModal__mask"
              style={{
                ...maskStyle.value,
                opacity: maskVisible.value ? props.maskOpacity : 0,
                transition: 'opacity 0.3s ease',
                pointerEvents: maskVisible.value ? 'auto' : 'none',
              }}
              onClick={handleMaskClick}
            />
          )}
          <GradAlphaMask
            mode="radial-to-center"
            duration={[0.5, 0.3]}
            visible={visible.value}
            withEnterTransition={true}
            onBeforeEnter={() => {
              isEntering.value = true
            }}
            onAfterEnter={() => {
              isEntering.value = false
            }}
            onBeforeLeave={() => {
              isLeaving.value = true
            }}
            onAfterLeave={() => {
              isLeaving.value = false
            }}
          >
            {{
              default: () => (
                <div
                  class="EZModal__drag-shell"
                  ref={dragShellRef}
                  style={{
                    transform: `translate3d(${dragOffsetX.value}px, ${dragOffsetY.value}px, 0)`,
                    zIndex: zIndexValue.value + 1,
                    pointerEvents: 'auto',
                  }}
                >
                  <div
                    class={[
                      'EZModal__container',
                      { 'EZModal__container--centered': props.centered },
                    ]}
                    style={bodyStyle.value}
                    ref={bodyRef}
                  >
                    {header}
                    {body}
                    {footer}
                  </div>
                </div>
              ),
            }}
          </GradAlphaMask>
        </div>
      )

      return panelContent
    }

    const { GradAlphaMask } = useGradAlphaMask()

    const renderTeleport = () => {
      if (!shouldRender.value) return null

      // appendTo=false 时禁用 Teleport，保持在当前组件树节点渲染
      if (props.appendTo === false) {
        return renderPanel()
      }

      const target = props.appendTo || 'body'
      return <Teleport to={target}>{renderPanel()}</Teleport>
    }

    return () => {
      if (props.destroyOnClose && !visible.value && !isLeaving.value) {
        return null
      }
      return renderTeleport()
    }
  },
})

// ==================== useEZModal Hook Types ====================
import { createApp, h, type App, type Component } from 'vue'

/**
 * openModal payload 结构
 */
type OpenModalPayload = {
  /** 临时覆盖的弹窗 props */
  ezModalProps?: Partial<EZModalProps>
  /** 临时覆盖的内容（作为默认 slot） */
  content?: VNode | VNode[] | null
  /** 临时覆盖的标题 slot */
  slotTitle?: (props: { title?: string }) => VNode | VNode[] | null
  /** 临时覆盖的页脚 slot */
  slotFooter?: (props: { footer?: VNode | VNode[] | null }) => VNode | VNode[] | null
}

/**
 * useEZModal 配置选项
 */
type UseEZModalOptions = {
  /** 是否全局弹窗模式 */
  global?: boolean
  /** 初始内容（作为 EZModal 默认 slot） */
  content?: VNode | VNode[] | null
  /** 初始 EZModal props */
  ezModalProps?: Partial<EZModalProps>
  /** 初始标题 slot */
  slotTitle?: (props: { title?: string }) => VNode | VNode[] | null
  /** 初始页脚 slot */
  slotFooter?: (props: { footer?: VNode | VNode[] | null }) => VNode | VNode[] | null
}

/**
 * useEZModal 返回值类型
 */
type UseEZModalReturn = {
  /** 可渲染组件（global=false 时需在组件树中渲染） */
  EZModalComponent: Component

  /** 标题 slot */
  slotTitle?: (props: { title?: string }) => VNode | VNode[] | null

  /** 页脚 slot */
  slotFooter?: (props: { footer?: VNode | VNode[] | null }) => VNode | VNode[] | null

  /** 打开弹窗（支持运行时覆盖） */
  openModal: (payload?: OpenModalPayload) => void
  /** 请求关闭弹窗（走 EZModal 关闭管线） */
  closeModal: () => void
}

/**
 * useEZModal hook 默认配置
 */
const defaultOptions: UseEZModalOptions = {
  global: false,
  content: null,
  ezModalProps: {},
  slotTitle: undefined,
  slotFooter: undefined,
}

/**
 * useEZModal - 可编程弹窗 hook
 *
 * 提供两种使用模式：
 * - global=false: 返回可渲染组件，需在组件树中插入
 * - global=true: 自动挂载到 document.body，管理完整生命周期
 *
 * Props 合并优先级：EZModal 默认值 < options.ezModalProps < openModal(payload).ezModalProps
 */
export const useEZModal = (options: UseEZModalOptions = {}): UseEZModalReturn => {
  // 合并选项
  const mergedOptions: UseEZModalOptions = {
    ...defaultOptions,
    ...options,
    ezModalProps: { ...defaultOptions.ezModalProps, ...options.ezModalProps },
  }
  const { global = false } = mergedOptions

  // ==================== 状态管理 ====================
  const visible = ref(false)
  const currentContent = ref<VNode | VNode[] | null>(mergedOptions.content ?? null)
  const currentSkModalProps = ref<Partial<EZModalProps>>(mergedOptions.ezModalProps ?? {})
  const currentSlotTitle = ref<UseEZModalOptions['slotTitle']>(mergedOptions.slotTitle)
  const currentSlotFooter = ref<UseEZModalOptions['slotFooter']>(mergedOptions.slotFooter)

  // Global 模式专用状态
  let globalApp: App<Element> | null = null
  let globalContainer: HTMLElement | null = null
  let globalRootComponent: Component | null = null

  // ==================== 工具函数 ====================

  /**
   * 合并 props（浅合并）
   * 优先级：基础 < 初始选项 < 运行时 payload
   */
  const mergeProps = (payload?: OpenModalPayload): Partial<EZModalProps> => {
    return {
      ...mergedOptions.ezModalProps,
      ...currentSkModalProps.value,
      ...payload?.ezModalProps,
    }
  }

  /**
   * 更新内容（浅合并）
   */
  const mergeContent = (payload?: OpenModalPayload): VNode | VNode[] | null => {
    return payload?.content ?? currentContent.value
  }

  const mergeSlotTitle = (payload?: OpenModalPayload) => {
    return payload?.slotTitle ?? currentSlotTitle.value
  }

  const mergeSlotFooter = (payload?: OpenModalPayload) => {
    return payload?.slotFooter ?? currentSlotFooter.value
  }

  /**
   * 关闭回调处理（用于 afterClosed 时销毁）
   */
  const handleAfterClosed = () => {
    const props = currentSkModalProps.value
    if (props.destroyOnClose && global && globalApp && globalContainer) {
      // 销毁 global 实例
      globalApp.unmount()
      if (globalContainer.parentNode) {
        globalContainer.parentNode.removeChild(globalContainer)
      }
      globalApp = null
      globalContainer = null
      globalRootComponent = null
    }
  }

  // ==================== Global 模式组件 ====================
  const GlobalModalComponent = defineComponent({
    name: 'UseEZModalGlobal',
    setup() {
      return () => {
        const props = {
          ...currentSkModalProps.value,
          modelValue: visible.value,
          'onUpdate:modelValue': (val: boolean) => {
            visible.value = val
          },
          onClosed: handleAfterClosed,
        }

        return h(EZModal, props, {
          default: () => currentContent.value ?? 'EZModal易用的弹窗',
          title: currentSlotTitle.value
            ? () => currentSlotTitle.value?.({ title: currentSkModalProps.value.title })
            : undefined,
          footer: currentSlotFooter.value
            ? () => currentSlotFooter.value?.({ footer: null })
            : undefined,
        })
      }
    },
  })

  // ==================== In-Tree 模式组件 ====================
  const InTreeModalComponent = defineComponent({
    name: 'UseEZModalInTree',
    // In-tree 模式支持外部 slots（优先级：外部 slots > hook 运行时内容）
    setup(_, { slots }) {
      return () => {
        const props = {
          ...currentSkModalProps.value,
          modelValue: visible.value,
          'onUpdate:modelValue': (val: boolean) => {
            visible.value = val
          },
          onClosed: handleAfterClosed,
        }

        const isEmptySlotContent = (content: VNode | VNode[] | null | undefined) => {
          if (content === null || content === undefined) return true
          if (Array.isArray(content)) return content.length === 0
          return false
        }

        const externalDefault = slots.default?.() ?? null
        const resolvedDefault = isEmptySlotContent(externalDefault)
          ? currentContent.value
          : externalDefault
        const shouldRenderDefault = !isEmptySlotContent(resolvedDefault)

        return h(EZModal, props, {
          // default slot：外部传入优先，其次使用 hook 内容
          default: shouldRenderDefault ? () => resolvedDefault : undefined,
          // title slot：外部传入优先，其次使用 hook slotTitle
          title: slots.title
            ? () => slots.title?.()
            : currentSlotTitle.value
              ? () => currentSlotTitle.value?.({ title: currentSkModalProps.value.title })
              : undefined,
          // footer slot：外部传入优先，其次使用 hook slotFooter
          footer: slots.footer
            ? () => slots.footer?.()
            : currentSlotFooter.value
              ? () => currentSlotFooter.value?.({ footer: null })
              : undefined,
        })
      }
    },
  })

  // ==================== 核心 API ====================

  /**
   * 打开弹窗
   * 执行顺序：合并 props/content → 设置 visible=true
   */
  const openModal = (payload?: OpenModalPayload) => {
    // 1. 先合并 props 和 content（避免闪烁）
    const mergedSkModalProps = mergeProps(payload)
    const mergedContent = mergeContent(payload)
    const mergedSlotTitle = mergeSlotTitle(payload)
    const mergedSlotFooter = mergeSlotFooter(payload)

    currentSkModalProps.value = mergedSkModalProps
    currentContent.value = mergedContent
    currentSlotTitle.value = mergedSlotTitle
    currentSlotFooter.value = mergedSlotFooter

    if (global) {
      // Global 模式：首次打开时创建应用
      if (!globalApp) {
        globalContainer = document.createElement('div')
        globalContainer.className = 'use-ez-modal-global-container'
        document.body.appendChild(globalContainer)

        globalApp = createApp({
          render: () => h(GlobalModalComponent),
        })

        globalApp.mount(globalContainer)
      }

      // 复用现有实例，只更新状态
      nextTick(() => {
        visible.value = true
      })
    } else {
      // In-Tree 模式：直接更新状态
      visible.value = true
    }
  }

  /**
   * 请求关闭弹窗
   * 必须走 EZModal 的关闭管线（尊重 beforeClose）
   */
  const closeModal = () => {
    // 通过设置 visible=false 触发 EZModal 的关闭流程
    // EZModal 内部会调用 requestClose，从而触发 beforeClose 等拦截逻辑
    visible.value = false
  }

  // ==================== 清理函数 ====================
  const cleanup = () => {
    if (global && globalApp && globalContainer) {
      globalApp.unmount()
      if (globalContainer.parentNode) {
        globalContainer.parentNode.removeChild(globalContainer)
      }
      globalApp = null
      globalContainer = null
      globalRootComponent = null
    }
  }

  // 返回结果
  return {
    EZModalComponent: global ? (null as unknown as Component) : InTreeModalComponent,
    openModal,
    closeModal,
  }
}

// ==================== 全局样式注入 ====================
const cssContent = /*css*/ `
  .EZModal {
    /* 根容器 */
  }

  .EZModal__mask {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: #000000;
    pointer-events: auto;
  }

  .EZModal__panel {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
  }

  .EZModal__container {
    position: relative;
    background-color: #ffffff;
    border-radius: 8px;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.15);
    pointer-events: auto;
    display: flex;
    flex-direction: column;
    max-height: 90vh;
    max-width: 90vw;
    z-index: 3000;
  }

  .EZModal__drag-shell {
    position: relative;
    will-change: transform;
  }

  .EZModal__container--centered {
    margin: auto;
  }

  .EZModal__header {
    padding: 16px 24px;
    border-bottom: 1px solid #ebeef5;
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-shrink: 0;
  }

  .EZModal__header--draggable {
    cursor: move;
    user-select: none;
  }

  .EZModal__title {
    font-size: 18px;
    font-weight: 500;
    color: #303133;
    margin: 0;
  }

  .EZModal__close-btn {
    width: 32px;
    height: 32px;
    border: none;
    background: transparent;
    cursor: pointer;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #909399;
    transition: all 0.2s;
  }

  .EZModal__close-btn:hover {
    background-color: #f5f7fa;
    color: #409eff;
  }

  .EZModal__close-btn:focus {
    outline: none;
    box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.3);
  }

  .EZModal__body {
    padding: 20px 24px;
    flex: 1;
    overflow-y: auto;
    color: #606266;
    font-size: 14px;
    line-height: 1.5;
  }

  .EZModal__footer {
    padding: 16px 24px;
    border-top: 1px solid #ebeef5;
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    flex-shrink: 0;
  }

  .EZModal-fade-enter-active,
  .EZModal-fade-leave-active {
    transition: opacity 0.3s ease;
  }

  .EZModal-fade-enter-active .EZModal__mask,
  .EZModal-fade-enter-active .EZModal__container,
  .EZModal-fade-leave-active .EZModal__mask,
  .EZModal-fade-leave-active .EZModal__container {
    transition: all 0.3s ease;
  }

  .EZModal-fade-enter-from .EZModal__mask,
  .EZModal-fade-leave-to .EZModal__mask {
    opacity: 0;
  }

  .EZModal-fade-enter-from .EZModal__container,
  .EZModal-fade-leave-to .EZModal__container {
    opacity: 0;
    transform: scale(0.95);
  }

  .EZModal-fade-enter-to,
  .EZModal-fade-leave-from {
    opacity: 1;
  }

  .EZModal-fade-enter-to .EZModal__container,
  .EZModal-fade-leave-from .EZModal__container {
    opacity: 1;
    transform: scale(1);
  }
`

// 注入全局样式
if (typeof document !== 'undefined') {
  const styleId = 'ez-model-global-styles'
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style')
    style.id = styleId
    style.textContent = cssContent
    document.head.appendChild(style)
  }
}

export default EZModal
