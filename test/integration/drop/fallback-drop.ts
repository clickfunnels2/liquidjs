import { expect } from 'chai'
import { Liquid, Drop, FallbackDrop } from '../../../src/liquid'
import { Context } from '../../../src/context/context'

class FallbackDropImpl extends FallbackDrop {
  scope: Record<string, any>
  constructor (scope: Record<string, any>) {
    super()
    this.scope = scope
  }
  public async liquidMethodMissing (key: string, paths: string[], scope: object, index?: number, context?: Context): Promise<any> {
    // This is just an example of replacing keys if the context being used is the global (not a context from a for loop)
    if (!context || scope !== context.globals) return
    const promiseResult = await new Promise(resolve => {
      ((async () => {
        let value
        if (paths) {
          if (index === 0) {
            if (key === 'courses') {
              value = await new Promise(resolve => setTimeout(
                () => {
                  resolve([{ title: 'Course 1', url: 'https://test.com/course-1' }, { title: 'Course 2', url: 'https://test.com/course-2' }])
                }, 0))
            }
            if (key === 'contact') {
              value = await new Promise(resolve => setTimeout(
                () => {
                  resolve({ name: 'Bob' })
                }, 0))
            }
          }
        }
        if (value) {
          context.environments[key] = value
          resolve(context.getFromScope(context.environments, paths))
        } else {
          resolve(undefined)
        }
      }) as any)()
    })
    return promiseResult
  }
}

describe('drop/fallback-drop', function () {
  let liquid: Liquid

  before(() => {
    const fallbackDropIml = new FallbackDropImpl({})
    liquid = new Liquid({ fallbackDrop: fallbackDropIml })
  })

  it('should support promise of array', async function () {
    const src = `{% for course in courses %}{{contact.name}} - {{course.title}} - {{course.url}} -{{course.position}}|{% endfor %}`
    const html = await liquid.parseAndRender(src, {})
    return expect(html).to.equal(`Bob - Course 1 - https://test.com/course-1 -|Bob - Course 2 - https://test.com/course-2 -|`)
  })
})
