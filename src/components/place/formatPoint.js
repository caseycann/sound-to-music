// "x 0.42, y −0.31": two decimals, with a real minus sign.
const fmt = (n) => n.toFixed(2).replace('-', '−')

export const formatPoint = ({ x, y }) => `x ${fmt(x)}, y ${fmt(y)}`
