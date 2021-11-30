import { Drop } from './drop'
import { Context } from '../context/context'

export class FallbackDrop extends Drop {
  public liquidMethodMissing (key: string, paths?: string[], scope?: object, index?: number, context?: Context): Promise<string | undefined> | string | undefined {
    return undefined
  }
}
