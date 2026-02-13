import { defineComponent, Transition, type PropType } from 'vue'

type TransitionHook = () => void

const GradAlphaMask = defineComponent({
  name: 'GradAlphaMask',
  props: {
    visible: {
      type: Boolean,
      default: false,
    },
    mode: {
      type: String,
      default: 'radial-to-center',
    },
    duration: {
      type: [Number, Array],
      default: () => [0.3, 0.3],
    },
    withEnterTransition: {
      type: Boolean,
      default: true,
    },
    onBeforeEnter: {
      type: Function as PropType<TransitionHook>,
      default: undefined,
    },
    onAfterEnter: {
      type: Function as PropType<TransitionHook>,
      default: undefined,
    },
    onBeforeLeave: {
      type: Function as PropType<TransitionHook>,
      default: undefined,
    },
    onAfterLeave: {
      type: Function as PropType<TransitionHook>,
      default: undefined,
    },
  },
  setup(props, { slots }) {
    return () => (
      <Transition
        name="EZModal-fade"
        appear={props.withEnterTransition}
        onBeforeEnter={() => props.onBeforeEnter?.()}
        onAfterEnter={() => props.onAfterEnter?.()}
        onBeforeLeave={() => props.onBeforeLeave?.()}
        onAfterLeave={() => props.onAfterLeave?.()}
      >
        {props.visible ? slots.default?.() : null}
      </Transition>
    )
  },
})

export const useGradAlphaMask = () => ({
  GradAlphaMask,
})
