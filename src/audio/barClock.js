// Look-ahead bar clock. A short interval timer wakes up often and hands every
// bar that starts inside the look-ahead window to onBar(time, index), with
// time on the engine's clock (NTP seconds) and index counting bars from 0 at
// start(). onBar sends the bar's sounds as a timestamped OSC bundle, so the
// audio thread sets the timing, not the timer.

const TICK_MS = 25
const LOOKAHEAD_S = 0.15
const START_DELAY_S = 0.05

export function createBarClock({ now, getBarSeconds, onBar }) {
  let timer = null
  let lastBar = null // time and index of the last bar handed to onBar
  let lastIndex = -1

  function tick() {
    const t = now()
    // Measured from the last bar on every tick, so a BPM change applies to
    // the next bar that hasn't been sent yet.
    let nextBar = lastBar === null ? t + START_DELAY_S : lastBar + getBarSeconds()
    let index = lastIndex + 1
    // The timer was held up (e.g. a throttled background tab): skip the bars
    // that are already late instead of firing them all at once. They still
    // count, so the loop stays in step.
    if (nextBar < t) {
      const bar = getBarSeconds()
      const skipped = Math.ceil((t - nextBar) / bar)
      nextBar += skipped * bar
      index += skipped
    }
    while (nextBar < t + LOOKAHEAD_S) {
      onBar(nextBar, index)
      lastBar = nextBar
      lastIndex = index++
      nextBar += getBarSeconds()
    }
  }

  return {
    start() {
      if (timer) return
      lastBar = null
      lastIndex = -1
      tick()
      timer = setInterval(tick, TICK_MS)
    },
    stop() {
      clearInterval(timer)
      timer = null
    },
    get running() {
      return timer !== null
    },
  }
}
