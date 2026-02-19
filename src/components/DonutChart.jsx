import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Circle, G, Text as SvgText } from 'react-native-svg';

export default function DonutChart({ data, size = 240, strokeWidth = 50 }) {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const center = size / 2;

    // Calcular el total
    const total = data.reduce((sum, item) => sum + item.value, 0);

    // Si no hay datos, mostrar 50/50
    let segments;
    if (total === 0) {
        segments = [
            {
                value: 50,
                color: '#4CAF50',
                text: '0',
                percentage: 50,
                strokeDasharray: `${(50 / 100) * circumference} ${circumference}`,
                strokeDashoffset: 0,
            },
            {
                value: 50,
                color: '#FFEB3B',
                text: '0',
                percentage: 50,
                strokeDasharray: `${(50 / 100) * circumference} ${circumference}`,
                strokeDashoffset: -((50 / 100) * circumference),
            },
        ];
    } else {
        // Calcular los segmentos normalmente
        let accumulatedPercentage = 0;
        segments = data.map((item) => {
            const percentage = (item.value / total) * 100;
            const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`;
            const strokeDashoffset = -((accumulatedPercentage / 100) * circumference);

            const segment = {
                ...item,
                percentage,
                strokeDasharray,
                strokeDashoffset,
            };

            accumulatedPercentage += percentage;
            return segment;
        });
    }

    // Calcular posición del texto en cada segmento
    const getTextPosition = (index) => {
        let accumulatedAngle = 0;
        for (let i = 0; i < index; i++) {
            accumulatedAngle += segments[i].percentage;
        }
        const midAngle = accumulatedAngle + segments[index].percentage / 2;
        const angleInRadians = ((midAngle / 100) * 360 - 90) * (Math.PI / 180);

        const textRadius = radius;
        const x = center + textRadius * Math.cos(angleInRadians);
        const y = center + textRadius * Math.sin(angleInRadians);

        return { x, y };
    };

    return (
        <View style={styles.container}>
            <Svg width={size} height={size}>
                <G rotation="-90" origin={`${center}, ${center}`}>
                    {segments.map((segment, index) => (
                        <Circle
                            key={`circle-${index}`}
                            cx={center}
                            cy={center}
                            r={radius}
                            stroke={segment.color}
                            strokeWidth={strokeWidth}
                            fill="transparent"
                            strokeDasharray={segment.strokeDasharray}
                            strokeDashoffset={segment.strokeDashoffset}
                            strokeLinecap="butt"
                        />
                    ))}
                </G>

                {/* Textos en los segmentos */}
                {segments.map((segment, index) => {
                    const textPos = getTextPosition(index);
                    return (
                        <SvgText
                            key={`text-${index}`}
                            x={textPos.x}
                            y={textPos.y}
                            fontSize="24"
                            fontWeight="bold"
                            fill="#000"
                            textAnchor="middle"
                            alignmentBaseline="middle"
                        >
                            {segment.text}
                        </SvgText>
                    );
                })}
            </Svg>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
    },
});
