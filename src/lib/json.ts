export interface IPackage {
  name: string
  version: string
  description: string
  main: string
  types: string
  repository: string
  author: string
  license: string
  private: boolean
  keywords: string[]
  files: string[]
  engines: { [key: string]: string }
  scripts: { [key: string]: string }
  devDependencies: { [key: string]: string }
  dependencies: { [key: string]: string }
}

export const packageJSON: IPackage = require('../../package.json')
