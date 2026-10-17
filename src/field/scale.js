import { scaleLinear } from 'd3'

// Geometry shared by the field's SVG pieces. Field coordinates run -1 to 1;
// the SVG viewBox is SIZE x SIZE with PAD around the plot for axis labels.
export const SIZE = 400
export const PAD = 30

export const toPxX = scaleLinear().domain([-1, 1]).range([PAD, SIZE - PAD]).clamp(true)
// Flipped: Hold (+1) is up.
export const toPxY = scaleLinear().domain([-1, 1]).range([SIZE - PAD, PAD]).clamp(true)
