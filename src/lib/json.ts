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

export interface IEmojis {
  name: null | string
  unified: string
  non_qualified: null | string
  docomo: null | string
  au: null | string
  softbank: null | string
  google: null | string
  sheet_x: number
  sheet_y: number
  short_name: string
  short_names: string[]
  text: null | string
  texts: string[] | null
  category: EmojiCategory
  sort_order: number
  added_in: string
  has_img_apple: boolean
  has_img_google: boolean
  has_img_twitter: boolean
  has_img_facebook: boolean
  has_img_messenger: boolean
  skin_variations?: { [key: string]: IEmojiSkinVariation }
  obsoletes?: string
  obsoleted_by?: string
}

export enum EmojiCategory {
  Activities = 'Activities',
  AnimalsNature = 'Animals & Nature',
  Flags = 'Flags',
  FoodDrink = 'Food & Drink',
  Objects = 'Objects',
  SkinTones = 'Skin Tones',
  SmileysPeople = 'Smileys & People',
  Symbols = 'Symbols',
  TravelPlaces = 'Travel & Places'
}

export interface IEmojiSkinVariation {
  unified: string
  non_qualified: null | string
  image: string
  sheet_x: number
  sheet_y: number
  added_in: string
  has_img_apple: boolean
  has_img_google: boolean
  has_img_twitter: boolean
  has_img_facebook: boolean
  has_img_messenger: boolean
  obsoletes?: string
  obsoleted_by?: string
}

export const packageJSON: IPackage = require('../../package.json')
