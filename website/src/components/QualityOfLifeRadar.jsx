import React from 'react'
import {
    ResponsiveContainer,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    Radar
} from 'recharts'

/**
 * Quality of Life Radar Chart Component
 */
const QualityOfLifeRadar = ({ data }) => {
    if (!data) return null

    const radarData = [
        { subject: 'Verde', value: data.comp_verde || 0, fullMark: 100 },
        { subject: 'Servizi', value: data.comp_mercati || 0, fullMark: 100 },
        { subject: 'Densità', value: data.comp_densita || 0, fullMark: 100 },
        { subject: 'Dinamica', value: data.comp_dinamica || 0, fullMark: 100 }
    ]

    return (
        <ResponsiveContainer width="100%" height={180}>
            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                <PolarGrid stroke="rgba(255,255,255,0.1)" />
                <PolarAngleAxis
                    dataKey="subject"
                    tick={{ fill: '#9ca3af', fontSize: 10 }}
                />
                <PolarRadiusAxis
                    angle={30}
                    domain={[0, 100]}
                    tick={false}
                    axisLine={false}
                />
                <Radar
                    name="Qualità"
                    dataKey="value"
                    stroke="#3b82f6"
                    fill="#3b82f6"
                    fillOpacity={0.3}
                    strokeWidth={2}
                />
            </RadarChart>
        </ResponsiveContainer>
    )
}

export default QualityOfLifeRadar
