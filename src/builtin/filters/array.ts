import { isArray, isNil, last as arrayLast } from '../../util/underscore'
import { toArray } from '../../util/collection'
import { isTruthy } from '../../render/boolean'
import { FilterImpl } from '../../template/filter/filter-impl'
import { Scope } from '../../context/scope'

export const join = (v: any[], arg: string) => v.join(arg === undefined ? ' ' : arg)
export const last = (v: any) => isArray(v) ? arrayLast(v) : ''
export const first = (v: any) => isArray(v) ? v[0] : ''
export const reverse = (v: any[]) => [...v].reverse()

export function sort<T> (this: FilterImpl, arr: T[], property?: string) {
  const getValue = (obj: Scope) => property ? this.context.getFromScope(obj, property.split('.')) : obj
  return toArray(arr).sort((lhs, rhs) => {
    lhs = getValue(lhs)
    rhs = getValue(rhs)
    return lhs < rhs ? -1 : (lhs > rhs ? 1 : 0)
  })
}

type OperationType = 'global' | 'scoped'
function getFromExpression (originalString: string, cb: (value: string, operationType: OperationType) => string, expectedClose?: string, iter = 0): string {
  const operationMapping: Record<OperationType, { open: string; close: string }> = {
    global: {
      open: '{',
      close: '}'
    },
    scoped: {
      open: '(',
      close: ')'
    }
  }
  const openTerms = Object.values(operationMapping).map(v => v.open)
  let i = iter
  let strLength = originalString.length
  while (i < strLength) {
    const term = originalString[i]
    if (openTerms.includes(term)) {
      const operation = Object.entries(operationMapping).find(([k, v]) => v.open === term)
      if (operation) {
        originalString = getFromExpression(originalString, cb, operation[1].close, i + 1)
        strLength = originalString.length
      }
    } else if (term === expectedClose) {
      const operationType = (Object.entries(operationMapping).find(([, v]) => v.close === term) || [])[0]
      const substr = originalString.substr(iter, i - iter)
      const resCb = cb(substr, operationType as OperationType)
      const resolvedString = originalString.substr(0, iter - 1) + resCb + originalString.substr(i + 1)
      return resolvedString
    }
    i++
  }
  return originalString
}

export const size = (v: string | any[]) => (v && v.length) || 0

export function map<T1, T2> (this: FilterImpl, arr: Scope[], property: string) {
  return toArray(arr).map(obj => this.context.getFromScope(obj, property.split('.')))
}

export function compact<T> (this: FilterImpl, arr: T[]) {
  return toArray(arr).filter(x => !isNil(x))
}

export function concat<T1, T2> (v: T1[], arg: T2[] | T2): (T1 | T2)[] {
  return toArray(v).concat(arg)
}

export function slice<T> (v: T[], begin: number, length = 1): T[] {
  begin = begin < 0 ? v.length + begin : begin
  return v.slice(begin, begin + length)
}

export function where<T extends object> (this: FilterImpl, arr: T[], property: string, expected?: any): T[] {
  return toArray(arr).filter(obj => {
    if (/[{}()]/.test(property)) {
      const envVar = this.context.environments
      const value = getFromExpression(property, (term, operation) => {
        switch (operation) {
          case 'global': {
            return String(this.context.getFromScope(envVar, String(term).split('.')))
          }
          case 'scoped': {
            return String(this.context.getFromScope(obj, String(term).split('.')))
          }
        }
      })
      return expected === undefined ? isTruthy(value, this.context) : value === expected
    } else {
      const value = this.context.getFromScope(obj, String(property).split('.'))
      return expected === undefined ? isTruthy(value, this.context) : value === expected
    }
  })
}

export function uniq<T> (arr: T[]): T[] {
  const u = {}
  return (arr || []).filter(val => {
    if (u.hasOwnProperty(String(val))) return false
    u[String(val)] = true
    return true
  })
}
