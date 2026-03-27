export const chartTheme = {
  gridStroke: '#cbd5e1',
  axisTick: { fill: '#94a3b8', fontSize: 12 },
  categoryTick: { fill: '#64748b', fontSize: 12 },
  tooltipStyle: { borderRadius: 12, border: '1px solid #cbd5e1' },
  colors: {
    cyan: '#38bdf8',
    emerald: '#22c55e',
    amber: '#f59e0b',
    rose: '#fb7185',
    slate: '#cbd5e1'
  }
} as const;

export const formatCurrency = (value: number | string) => `Rs. ${Number(value).toFixed(2)}`;
