/**
 * Defines, creates and collects branches for each thought process.
 * @module components/branch
 */

import logger from '../util/logger'
import { counter } from '../util/id'
import { bits } from './bit'
import { Middleware } from './middleware'
import { Conditions, ConditionInput } from './condition'
import {
  Message,
  TextMessage,
  CatchAllMessage,
  ServerMessage,
  EnterMessage,
  LeaveMessage,
  TopicMessage
} from './message'
import { NLUCriteria, NLUResultsRaw } from './nlu'
import { IBranchProps } from './class/Branch';
import { Action } from './interface';
import { TextBranch } from './class/TextBranch';


  

  /** Create text branch pre-matched on the bot name as prefix. */
  direct (
    condition: ConditionInput,
    action: Action,
    atts?: IBranch
  ) {
    return this.add(new TextDirectBranch(condition, action, atts))
  }

  /** Create custom branch with provided matcher, action and optional meta. */
  custom (
    matcher: IMatcher,
    action: Action,
    atts?: IBranch
  ) {
    return this.add(new CustomBranch(matcher, action, atts), 'listen')
  }

  /** Create a branch that triggers when no other branch matches. */
  catchAll (
    action: Action,
    atts?: IBranch
  ) {
    return this.add(new CatchAllBranch(action, atts))
  }

  /** Create a natural language branch to match on NLU result attributes. */
  NLU (
    criteria: NLUCriteria,
    action: Action,
    atts?: IBranch
  ) {
    return this.add(new NLUBranch(criteria, action, atts))
  }

  /** Create a natural language branch pre-matched on the bot name as prefix. */
  directNLU (
    criteria: NLUCriteria,
    action: Action,
    atts?: IBranch
  ) {
    return this.add(new NLUDirectBranch(criteria, action, atts))
  }

  /** Create a natural language branch with custom matcher. */
  customNLU (
    matcher: IMatcher,
    action: Action,
    atts?: IBranch
  ) {
    return this.add(new CustomBranch(matcher, action, atts), 'understand')
  }

  /** Create a branch that triggers when user joins a room. */
  enter (
    action: Action,
    atts?: IBranch
  ) {
    return this.custom((msg: Message) => {
      return msg instanceof EnterMessage
    }, action, atts)
  }

  /** Create a branch that triggers when user leaves a room. */
  leave (
    action: Action,
    atts?: IBranch
  ) {
    return this.custom((msg: Message) => {
      return msg instanceof LeaveMessage
    }, action, atts)
  }

  /** Create a branch that triggers when user changes the topic. */
  topic (
    action: Action,
    atts?: IBranch
  ) {
    return this.custom((msg: Message) => {
      return msg instanceof TopicMessage
    }, action, atts)
  }

  /** Create a branch that triggers when server message matches criteria. */
  web (
    criteria: IWebBranchCriteria,
    action: Action,
    atts?: IBranch
  ) {
    return this.add(new WebBranch(criteria, action, atts))
  }

  /** Create a server branch with custom matcher. */
  customWeb (
    matcher: IMatcher,
    action: Action,
    atts?: IBranch
  ) {
    return this.add(new CustomBranch(matcher, action, atts), 'serve')
  }
}

export const branches = new BranchController()

export default branches
