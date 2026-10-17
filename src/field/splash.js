import { easeCubicOut } from 'd3'

// Click effects for DotField, drawn into the .dot-field-effects layer at a
// picked dot's position (px). A ring ripples out from every pick; a pick that
// adds a track (big) also flashes, sends a second ring and sprays sparks.
// Purely visual: the caller skips it under prefers-reduced-motion.

const SPARKS = 12
const DURATION_MS = 650

export function splash(layer, { x, y, quadrant, big }) {
  const g = layer
    .append('g')
    .attr('class', `splash q-${quadrant.toLowerCase()}`)
    .attr('transform', `translate(${x},${y})`)

  const ring = (delay, radius) =>
    g.append('circle')
      .attr('class', 'splash-ring')
      .attr('r', 7)
      .transition()
      .delay(delay)
      .duration(DURATION_MS)
      .ease(easeCubicOut)
      .attr('r', radius)
      .style('opacity', 0)

  ring(0, big ? 46 : 28)

  if (big) {
    ring(110, 74)
    g.append('circle')
      .attr('class', 'splash-flash')
      .attr('r', 10)
      .transition()
      .duration(260)
      .attr('r', 16)
      .style('opacity', 0)
    for (let i = 0; i < SPARKS; i++) {
      // Evenly spread, nudged so the spray doesn't look like a clock face.
      const angle = ((i + 0.3 * Math.sin(i * 7.1)) / SPARKS) * 2 * Math.PI
      const reach = 34 + (i % 3) * 9
      g.append('circle')
        .attr('class', 'splash-spark')
        .attr('r', 3)
        .transition()
        .duration(DURATION_MS + 100)
        .ease(easeCubicOut)
        .attr('cx', Math.cos(angle) * reach)
        .attr('cy', Math.sin(angle) * reach)
        .attr('r', 0)
    }
  }

  g.transition().delay(DURATION_MS + 250).remove()
}
