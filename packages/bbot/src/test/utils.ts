import logger from '../util/logger'

export const debug = () => logger.on('data', (e) => console.log(e.message))
export const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
