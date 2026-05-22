import { Injectable } from '@nestjs/common'

/**
 * Spreads scheduled touches so a batch does not fire at the exact same instant. Adds a
 * random 0..`jitterMinutes` to the base delay. Injectable so tests force zero jitter.
 */
@Injectable()
export class Jitter {
  apply(delayMinutes: number, jitterMinutes: number): number {
    if (jitterMinutes <= 0) return delayMinutes
    return delayMinutes + Math.floor(Math.random() * (jitterMinutes + 1))
  }
}
