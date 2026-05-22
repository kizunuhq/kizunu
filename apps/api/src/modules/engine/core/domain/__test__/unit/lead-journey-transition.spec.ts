import { JourneyEvent } from '@kizunu/api/modules/engine/core/domain/journey-event'
import { LeadJourneyStatus } from '@kizunu/api/modules/engine/core/domain/lead-journey-status'
import { transition } from '@kizunu/api/modules/engine/core/domain/lead-journey-transition'
import { InvalidJourneyTransitionException } from '@kizunu/api/modules/engine/core/errors/journey.errors'
import { describe, expect, it } from 'vite-plus/test'

const { Running, Paused, Replied, Exhausted, Stopped, ErrorState, PausedOwnerInactive } =
  LeadJourneyStatus

describe('transition', () => {
  describe('legal transitions', () => {
    it('a reply stops the cadence from any active state', () => {
      expect(transition(Running, JourneyEvent.Reply)).toBe(Replied)
      expect(transition(Paused, JourneyEvent.Reply)).toBe(Replied)
      expect(transition(PausedOwnerInactive, JourneyEvent.Reply)).toBe(Replied)
    })

    it('exhaustion and error apply to a running journey', () => {
      expect(transition(Running, JourneyEvent.Exhaust)).toBe(Exhausted)
      expect(transition(Running, JourneyEvent.Error)).toBe(ErrorState)
    })

    it('pauses and resumes', () => {
      expect(transition(Running, JourneyEvent.Pause)).toBe(Paused)
      expect(transition(Paused, JourneyEvent.Resume)).toBe(Running)
    })

    it('parks and revives an inactive-owner journey', () => {
      expect(transition(Running, JourneyEvent.OwnerInactive)).toBe(PausedOwnerInactive)
      expect(transition(PausedOwnerInactive, JourneyEvent.OwnerReactivated)).toBe(Running)
    })

    it('stops an active journey', () => {
      expect(transition(Running, JourneyEvent.Stop)).toBe(Stopped)
    })
  })

  describe('illegal transitions', () => {
    it('rejects exhausting a replied journey', () => {
      expect(() => transition(Replied, JourneyEvent.Exhaust)).toThrow(
        InvalidJourneyTransitionException,
      )
    })

    it('rejects resuming a running journey', () => {
      expect(() => transition(Running, JourneyEvent.Resume)).toThrow(
        InvalidJourneyTransitionException,
      )
    })

    it('rejects any event out of a terminal state', () => {
      expect(() => transition(Exhausted, JourneyEvent.Reply)).toThrow(
        InvalidJourneyTransitionException,
      )
      expect(() => transition(Stopped, JourneyEvent.Pause)).toThrow(
        InvalidJourneyTransitionException,
      )
      expect(() => transition(ErrorState, JourneyEvent.Resume)).toThrow(
        InvalidJourneyTransitionException,
      )
    })
  })
})
