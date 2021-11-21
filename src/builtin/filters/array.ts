import { isArray, isNil, last as arrayLast, stringify } from '../../util/underscore'
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
function calculate (originalString: string, cb: (value: string, operationType: OperationType) => string): string {
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
  const closeTerms = Object.values(operationMapping).map(v => v.close)
  let res = ''
  for (let i = 0; i < originalString.length; i++) {
    const term = originalString[i]
    if (openTerms.includes(term)) {
      for (let j = originalString.length - 1; j > i; j--) {
        const termBack = originalString[j]
        if (closeTerms.includes(termBack)) {
          const operation = Object.entries(operationMapping).find(([k, v]) => v.close === termBack)
          if (operation) {
            const length = j - i - 1
            const substr = originalString.substr(i + 1, length)
            const resCalc = calculate(substr, cb)
            const resCb = cb(resCalc, operation[0] as OperationType)
            i += length + 1
            res += resCb
            break
          }
        }
      }
    } else {
      res += term
    }
  }
  // console.log('res', res)
  return res
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
    if (property.startsWith('!')) {
      const envVar = this.context.environments
      console.log(property)
      const value = calculate(property, (term, operation) => {
        switch (operation) {
          case 'global': {
            console.log('global:', term)
            return String(this.context.getFromScope(envVar, String(term).split('.')))
          }
          case 'scoped': {
            console.log('scoped:', term)
            return String(this.context.getFromScope(obj, String(term).split('.')))
          }
        }
      })
      // property = property.split('%')[1] as string
      // const propertyFromObj = (property.match(/\$([^$]+)\$/) || ['', ''])[1]
      // const valueObj = String(this.context.getFromScope(obj, String(propertyFromObj).split('.')))
      // const processedProperty = property.replace(`$${propertyFromObj}$`, valueObj)

      // const envVar = this.context.environments
      // const value = this.context.getFromScope(envVar, String(processedProperty).split('.'))

      // console.log('****************************')
      // console.log('property', property)
      // console.log('propertyFromObj', propertyFromObj)
      // console.log('valueObj', valueObj)
      // console.log('processedProperty', processedProperty)
      // console.log('obj', obj)
      // console.log('envVar', envVar)
      // console.log('value', value)
      // console.log('****************************')
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
