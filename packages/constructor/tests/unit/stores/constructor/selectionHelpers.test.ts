import { describe, expect, it } from 'vitest'
import {
  readSelectionAsArray,
  readSelectionAsString,
} from '@/stores/constructor/selectionHelpers'

describe('readSelectionAsString', () => {
  it('normalises string values', () => {
    expect(readSelectionAsString('concept-a')).toBe('concept-a')
    expect(readSelectionAsString('')).toBe(null)
  })

  it('takes the first array item', () => {
    expect(readSelectionAsString(['first', 'second'])).toBe('first')
    expect(readSelectionAsString([])).toBe(null)
  })

  it('returns null for undefined', () => {
    expect(readSelectionAsString(undefined)).toBe(null)
  })
})

describe('readSelectionAsArray', () => {
  it('wraps a string in an array', () => {
    expect(readSelectionAsArray('name-a')).toEqual(['name-a'])
  })

  it('returns arrays unchanged', () => {
    expect(readSelectionAsArray(['a', 'b'])).toEqual(['a', 'b'])
  })

  it('returns empty array for missing values', () => {
    expect(readSelectionAsArray(undefined)).toEqual([])
    expect(readSelectionAsArray('')).toEqual([])
  })
})
