import Dialogue from './'

class StateController {
  dialogue?: Dialogue

  constructor (private _: {
    newDialogue: () => Dialogue,
    
  })
}
