/**
 * States accept some known common properties, but can accept any key/value pair
 * that is needed for a specific type of branch or middleware.
 * The `done` property tells middleware not to continue processing state.
 */
export interface IStateProps {
  done?: boolean
  exit?: boolean
  sequence?: string
  branch?: Branch
  [key: string]: any
}
