import { State } from './state/class'

/** State callback interface */
export interface ICallback { (b: State): any }

/** State callback or Bit ID to execute if the branch matched. */
export type Action = ICallback | string

export enum ProcessKey { listen, understand, serve, act }
export type ProcessKeys = keyof typeof ProcessKey

/** Branch matcher function interface, resolved value must be truthy. */
export interface IMatcher { (input: any): Promise<any> | any }

/** Called at the end of middleware with status of match. */
export interface IDone { (matched: boolean): void }
