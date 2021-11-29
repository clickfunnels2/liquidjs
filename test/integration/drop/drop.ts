import { expect } from 'chai'
import { Liquid, Drop, FallbackDrop } from '../../../src/liquid'
import { Context } from '../../../src/context/context'

describe('drop/drop', function () {
  let liquid: Liquid
  before(() => (liquid = new Liquid()))

  class CustomDrop extends Drop {
    private name = 'NAME'
    public getName () {
      return 'GET NAME'
    }
  }
  class CustomDropWithMethodMissing extends CustomDrop {
    public liquidMethodMissing (key: string) {
      return key.toUpperCase()
    }
  }
  class PromiseDrop extends Drop {
    private name = Promise.resolve('NAME')
    public async getName () {
      return 'GET NAME'
    }
    public async liquidMethodMissing (key: string) {
      return key.toUpperCase()
    }
  }
  class FallbackDropImpl extends FallbackDrop {
    scope: Record<string, any>
    constructor (scope: Record<string, any>) {
      super()
      this.scope = scope
    }
    public async liquidMethodMissing (key: string, paths: string[], scope: object, index?: number, context?: Context): Promise<any> {
      // This is just a precaution of replacing keys if the context being used is the global (not a context from a for loop)
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

  it('should call corresponding method when output', async function () {
    const html = await liquid.parseAndRender(`{{obj.getName}}`, { obj: new CustomDrop() })
    expect(html).to.equal('GET NAME')
  })
  it('should call corresponding method when expression evaluates', async function () {
    const html = await liquid.parseAndRender(`{% if obj.getName == "GET NAME" %}true{% endif %}`, { obj: new CustomDrop() })
    expect(html).to.equal('true')
  })
  it('should read corresponding property', async function () {
    const html = await liquid.parseAndRender(`{{obj.name}}`, { obj: new CustomDrop() })
    expect(html).to.equal('NAME')
  })
  it('should output empty string if not exist', async function () {
    const html = await liquid.parseAndRender(`{{obj.foo}}`, { obj: new CustomDrop() })
    expect(html).to.equal('')
  })
  it('should respect liquidMethodMissing', async function () {
    const html = await liquid.parseAndRender(`{{obj.foo}}`, { obj: new CustomDropWithMethodMissing() })
    expect(html).to.equal('FOO')
  })
  it('should call corresponding promise method', async function () {
    const html = await liquid.parseAndRender(`{{obj.getName}}`, { obj: new PromiseDrop() })
    expect(html).to.equal('GET NAME')
  })
  it('should read corresponding promise property', async function () {
    const html = await liquid.parseAndRender(`{{obj.name}}`, { obj: new PromiseDrop() })
    expect(html).to.equal('NAME')
  })
  it('should resolve before calling filters', async function () {
    const html = await liquid.parseAndRender(`{{obj.name | downcase}}`, { obj: new PromiseDrop() })
    expect(html).to.equal('name')
  })
  it('should support promise returned by liquidMethodMissing', async function () {
    const html = await liquid.parseAndRender(`{{obj.foo}}`, { obj: new PromiseDrop() })
    expect(html).to.equal('FOO')
  })
  it('should support promise of array', async function () {
    const fallbackDropIml = new FallbackDropImpl({})
    liquid = new Liquid({ fallbackDrop: fallbackDropIml })
    const src = `{% for course in courses %}{{contact.name}} - {{course.title}} - {{course.url}} -{{course.position}}|{% endfor %}`
    const html = await liquid.parseAndRender(src, {})
    return expect(html).to.equal(`Bob - Course 1 - https://test.com/course-1 -|Bob - Course 2 - https://test.com/course-2 -|`)
  })
})
