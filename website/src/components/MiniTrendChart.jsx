import React from 'react'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts'

const MiniTrendTooltip = ({ active, payload, label, formatter }) => {
    if (!active || !payload || payload.length === 0) return null
    const value = payload[0]?.value
    return (
        <div className="bg-black/80 border border-white/10 rounded-lg px-2 py-1 text-[10px] text-white">
            <div className="text-gray-400">{label}</div>
            <div className="font-semibold">{formatter ? formatter(value) : value}</div>
        </div>
    )
}

const MiniTrendChart = ({ data, dataKey, labelKey = 'label', color = '#3b82f6', valueFormatter }) => {
    if (!data || data.length === 0) return null

    return (
        <div className="h-24 w-full">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data}>
                    <XAxis dataKey={labelKey} hide />
                    <YAxis hide domain={['dataMin', 'dataMax']} />
                    <Tooltip content={<MiniTrendTooltip formatter={valueFormatter} />} />
                    <Line
                        type="monotone"
                        dataKey={dataKey}
                        stroke={color}
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 3 }}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    )
}

export default MiniTrendChart
