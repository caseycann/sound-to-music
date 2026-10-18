import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { scaleLinear, select, zoom, zoomIdentity } from 'd3'
import { QUADRANTS } from '../../shared/quadrants.js'
import { dotLabel, dotLayout, inTabOrder, nextDot, resizeTransform } from './dotField.js'
import { splash } from './splash.js'

export const PAD = 28 // px around the plot, for the axis labels
const MAX_ZOOM = 8
const ZOOM_STEP = 1.6

const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

// D3 side of DotField: scales, zoom/pan, and the data join for the dots,
// quadrant tints and centre lines inside the <svg> that svgRef points at.
// React renders the empty layers (see DotFieldFrame); this hook fills them.
//
// Returns active (the dot under the pointer or keyboard focus, with its
// position in px), zoomIn / zoomOut / resetZoom for the buttons, and
// focusField() to put keyboard focus on the field.
// A pick ripples out from the dot; with highlight on (the pick adds a
// track) it bursts instead.
//
// Keyboard: the field is one Tab stop (a roving tabindex): the last dot
// focused, or else the first unused one in reading order. Arrow keys move to
// the nearest dot that way (used ones too, so they can be heard about),
// Home / End go to the first / last dot, Enter or Space picks, and + / − / 0
// zoom in, out and back, around the focused dot.
export function useDotField({ svgRef, size, sounds, usedIds, states, onPick, highlight }) {
  const [transform, setTransform] = useState(zoomIdentity)
  const [activeId, setActiveId] = useState(null)
  const [focusId, setFocusId] = useState(null)
  const zoomRef = useRef(null)
  const sizeRef = useRef(size)
  const live = useRef({}) // latest values for the D3 event handlers
  live.current = { usedIds, onPick, transform, highlight }

  const dots = useMemo(() => inTabOrder(sounds.map(dotLayout)), [sounds])
  const tabStopId = useMemo(() => {
    if (dots.some((d) => d.sound.id === focusId)) return focusId
    return (dots.find((d) => !usedIds.has(d.sound.id)) ?? dots[0])?.sound.id ?? null
  }, [dots, focusId, usedIds])
  live.current.dots = dots

  const base = useMemo(
    () =>
      size > 0 && {
        x: scaleLinear().domain([-1, 1]).range([PAD, size - PAD]),
        y: scaleLinear().domain([-1, 1]).range([size - PAD, PAD]), // Hold (+1) is up
      },
    [size],
  )
  const scales = useMemo(
    () => base && { x: transform.rescaleX(base.x), y: transform.rescaleY(base.y) },
    [base, transform],
  )
  live.current.scales = scales

  // Zoom and pan. Re-run on resize to update the extents, keeping the view.
  useEffect(() => {
    if (!base) return
    const svg = select(svgRef.current)
    if (!zoomRef.current) {
      zoomRef.current = zoom()
        .scaleExtent([1, MAX_ZOOM])
        .clickDistance(4) // a tiny wobble on click is still a click, not a pan
        .on('zoom', (event) => setTransform(event.transform))
    }
    const extent = [[PAD, PAD], [size - PAD, size - PAD]]
    zoomRef.current.extent(extent).translateExtent(extent)
    svg.call(zoomRef.current).on('dblclick.zoom', null)

    const from = sizeRef.current
    sizeRef.current = size
    if (from && from !== size) {
      const t = resizeTransform(live.current.transform, from, size, PAD)
      svg.call(zoomRef.current.transform, zoomIdentity.translate(t.x, t.y).scale(t.k))
    }
  }, [base, size, svgRef])

  useEffect(() => {
    const svg = svgRef.current
    return () => { if (svg) select(svg).on('.zoom', null) }
  }, [svgRef])

  const animate = useCallback(
    (fn) => {
      const svg = select(svgRef.current)
      if (reducedMotion()) fn(svg)
      else fn(svg.transition().duration(250))
    },
    [svgRef],
  )

  // Pan a focused dot into view if zooming has left it outside the plot.
  const reveal = useCallback(
    (dot) => {
      const t = live.current.transform
      const px = t.applyX(base.x(dot.x))
      const py = t.applyY(base.y(dot.y))
      const inside = px >= PAD && px <= size - PAD && py >= PAD && py <= size - PAD
      if (!inside) animate((s) => s.call(zoomRef.current.translateTo, base.x(dot.x), base.y(dot.y)))
    },
    [animate, base, size],
  )
  const revealRef = useRef(reveal)
  revealRef.current = reveal

  // Data join: one <g class="dot"> per sound, in Tab order.
  useLayoutEffect(() => {
    if (!base) return
    const pick = (d) => {
      const { usedIds, onPick, scales, highlight } = live.current
      if (usedIds.has(d.sound.id)) return
      if (scales && !reducedMotion()) {
        const layer = select(svgRef.current).select('.dot-field-effects')
        splash(layer, { x: scales.x(d.x), y: scales.y(d.y), quadrant: d.quadrant, big: highlight })
      }
      onPick?.(d.sound)
    }
    const leave = (d) => setActiveId((id) => (id === d.sound.id ? null : id))

    const groups = select(svgRef.current)
      .select('.dot-field-dots')
      .selectAll('g.dot')
      .data(dots, (d) => d.sound.id)
      .join((enter) => {
        const g = enter.append('g').attr('role', 'button')
        g.append('circle').attr('class', 'dot-hit').attr('r', 13) // still target, bigger than the dot
        const body = g.append('g').attr('class', 'dot-body') // drifts
        body.append('circle').attr('class', 'dot-halo').attr('r', 12)
        body.append('circle').attr('class', 'dot-mark').attr('r', 7)
        return g
          .on('mouseenter', (_, d) => setActiveId(d.sound.id))
          .on('mouseleave', (_, d) => leave(d))
          .on('focus', (_, d) => { setActiveId(d.sound.id); setFocusId(d.sound.id); revealRef.current(d) })
          .on('blur', (_, d) => leave(d))
          .on('click', (_, d) => pick(d))
          .on('keydown', (event, d) => {
            if (event.key !== 'Enter' && event.key !== ' ') return
            event.preventDefault()
            pick(d)
          })
      })
      .order()

    groups
      .attr('class', (d) => {
        const used = usedIds.has(d.sound.id) ? ' is-used' : ''
        const state = states[d.sound.id] ? ` is-${states[d.sound.id]}` : ''
        return `dot q-${d.quadrant.toLowerCase()}${used}${state}`
      })
      .attr('tabindex', (d) => (d.sound.id === tabStopId ? 0 : -1))
      .attr('aria-disabled', (d) => (usedIds.has(d.sound.id) ? 'true' : null))
      .attr('aria-busy', (d) => (states[d.sound.id] === 'loading' ? 'true' : null))
      .attr('aria-label', (d) => dotLabel(d.sound, usedIds.has(d.sound.id), d.quadrant, states[d.sound.id]))
      .select('.dot-body')
      .style('--dx', (d) => `${d.drift.dx.toFixed(2)}px`)
      .style('--dy', (d) => `${d.drift.dy.toFixed(2)}px`)
      .style('animation-duration', (d) => `${d.drift.duration.toFixed(2)}s`)
      .style('animation-delay', (d) => `${d.drift.delay.toFixed(2)}s`)
  }, [base, dots, usedIds, states, tabStopId, svgRef])

  const focusDot = useCallback(
    (dot) => {
      select(svgRef.current)
        .selectAll('g.dot')
        .filter((d) => d.sound.id === dot.sound.id)
        .node()
        ?.focus()
    },
    [svgRef],
  )

  // Zoom by k around the focused dot, or the middle of the field.
  const zoomBy = useCallback(
    (k) => {
      const { scales, dots } = live.current
      const dot = dots.find((d) => d.sound.id === document.activeElement?.__data__?.sound?.id)
      const at = dot && scales ? [scales.x(dot.x), scales.y(dot.y)] : null
      animate((s) => (at ? s.call(zoomRef.current.scaleBy, k, at) : s.call(zoomRef.current.scaleBy, k)))
    },
    [animate],
  )
  const resetZoom = useCallback(() => animate((s) => s.call(zoomRef.current.transform, zoomIdentity)), [animate])

  // Arrow keys, Home / End and zoom keys while a dot has focus. (Enter and
  // Space are handled on the dot itself.)
  useEffect(() => {
    const svg = select(svgRef.current)
    svg.on('keydown.field', (event) => {
      const from = event.target.__data__
      if (!from?.sound) return
      const { dots } = live.current
      let to = null
      if (event.key === 'Home') to = dots[0]
      else if (event.key === 'End') to = dots[dots.length - 1]
      else if (event.key.startsWith('Arrow')) to = nextDot(dots, from, event.key) ?? from
      else if (event.key === '+' || event.key === '=') zoomBy(ZOOM_STEP)
      else if (event.key === '-' || event.key === '_') zoomBy(1 / ZOOM_STEP)
      else if (event.key === '0') resetZoom()
      else return
      event.preventDefault()
      if (to && to !== from) focusDot(to)
    })
    return () => { svg.on('keydown.field', null) }
  }, [svgRef, focusDot, zoomBy, resetZoom])

  // Positions: dots, quadrant tints and centre lines follow the zoom.
  // Dots keep their size; only where they sit changes.
  useLayoutEffect(() => {
    if (!scales) return
    const { x, y } = scales
    const svg = select(svgRef.current)
    svg.selectAll('g.dot').attr('transform', (d) => `translate(${x(d.x)},${y(d.y)})`)
    svg
      .select('.dot-field-tints')
      .selectAll('rect')
      .data(QUADRANTS, (q) => q.name)
      .join('rect')
      .attr('class', (q) => `q-${q.name.toLowerCase()}`)
      .attr('x', (q) => Math.min(x(0), x(q.x)))
      .attr('y', (q) => Math.min(y(0), y(q.y)))
      .attr('width', (q) => Math.abs(x(q.x) - x(0)))
      .attr('height', (q) => Math.abs(y(q.y) - y(0)))
    svg.select('.dot-field-center-x').attr('x1', x(-1)).attr('x2', x(1)).attr('y1', y(0)).attr('y2', y(0))
    svg.select('.dot-field-center-y').attr('x1', x(0)).attr('x2', x(0)).attr('y1', y(-1)).attr('y2', y(1))
  }, [scales, dots, svgRef])

  const activeDot = scales && dots.find((d) => d.sound.id === activeId)
  const active = activeDot && {
    sound: activeDot.sound,
    quadrant: activeDot.quadrant,
    used: usedIds.has(activeDot.sound.id),
    left: scales.x(activeDot.x),
    top: scales.y(activeDot.y),
  }

  return {
    active,
    zoomed: transform.k > 1,
    canZoomIn: transform.k < MAX_ZOOM,
    zoomIn: () => animate((s) => s.call(zoomRef.current.scaleBy, ZOOM_STEP)),
    zoomOut: () => animate((s) => s.call(zoomRef.current.scaleBy, 1 / ZOOM_STEP)),
    resetZoom,
    focusField: () => {
      const dot = dots.find((d) => d.sound.id === tabStopId)
      if (dot) focusDot(dot)
    },
  }
}
