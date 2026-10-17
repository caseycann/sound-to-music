// Look-ahead bar clock. A short interval timer wakes up often and hands every
// bar that starts inside the look-ahead window to onBar(time), with time on
// the engine's clock (NTP seconds). onBar sends the bar's sounds as a
// timestamped OSC bundle, so the audio thread sets the timing, not the timer.

const TICK_MS = 25
const LOOKAHEAD_S = 0.15
const START_DELAY_S = 0.05

export function createBarClock({ now, getBarSeconds, onBar }) {
  let timer = null
  let lastBar = null // time of the last bar handed to onBar

  function tick() {
    const t = now()
    // Measured from the last bar on every tick, so a BPM change applies to
    // the next bar that hasn't been sent yet.
    let nextBar = lastBar === null ? t + START_DELAY_S : lastBar + getBarSeconds()
    // The timer was held up (e.g. a throttled background tab): skip the bars
    // that are already late instead of firing them all at once.
    if (nextBar < t) {
      const bar = getBarSeconds()
      nextBar += Math.ceil((t - nextBar) / bar) * bar
    }
    while (nextBar < t + LOOKAHEAD_S) {
      onBar(nextBar)
      lastBar = nextBar
      nextBar += getBarSeconds()
    }
  }

  return {
    start() {
      if (timer) return
      lastBar = null
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
