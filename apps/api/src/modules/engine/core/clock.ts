import { Injectable } from '@nestjs/common'

/** Indirection over the system clock so time-dependent engine logic is testable. */
@Injectable()
export class Clock {
  now(): Date {
    return new Date()
  }
}
