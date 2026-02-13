import { describe, expect, it } from 'vitest'
import { EZModal, ezModalProps, useEZModal } from '../src/index'

describe('ez-modal exports', () => {
  it('should export component and hook', () => {
    expect(EZModal).toBeTruthy()
    expect(ezModalProps).toBeTruthy()
    expect(typeof useEZModal).toBe('function')
  })
})
