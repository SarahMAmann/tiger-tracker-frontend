import { NextResponse } from 'next/server';
import { getPool } from '../../lib/db';

export const revalidate = 0; // disable caching

interface AssetInsight {
    symbol: string;
    name: string;
    currentPrice: number;
    price24hAgo: number;
    change24h: number;
    trend: 'bullish' | 'bearish' | 'stable';
    trendStrength: 'strong' | 'modest' | 'weak';
    volatility: 'low' | 'moderate' | 'high';
    avgVolatility: number;
    maxGain: number;
    maxLoss: number;
    anomalies: string[];
    description: string;
}

export async function GET() {
    const pool = getPool();
    
    try {
        // Get 24-hour analysis data
        const sql = `
WITH recent_24h AS (
    SELECT 
        a.symbol,
        a.name,
        t.ts,
        t.price_usd,
        LAG(t.price_usd, 1) OVER (PARTITION BY a.symbol ORDER BY t.ts) AS prev_price,
        LAG(t.ts, 1) OVER (PARTITION BY a.symbol ORDER BY t.ts) AS prev_ts
    FROM transactions t
    JOIN assets a ON a.id = t.asset_id
    WHERE t.ts >= now() - interval '24 hours'
),
price_changes AS (
    SELECT 
        symbol,
        name,
        ts,
        price_usd,
        prev_price,
        CASE 
            WHEN prev_price IS NOT NULL AND prev_price > 0 
            THEN ((price_usd - prev_price) / prev_price * 100)
            ELSE 0
        END AS pct_change,
        EXTRACT(EPOCH FROM (ts - prev_ts)) / 60 AS minutes_gap
    FROM recent_24h
)
SELECT 
    pc.symbol,
    pc.name,
    (SELECT price_usd FROM recent_24h WHERE symbol = pc.symbol ORDER BY ts DESC LIMIT 1) AS current_price,
    (SELECT price_usd FROM recent_24h WHERE symbol = pc.symbol ORDER BY ts ASC LIMIT 1) AS price_24h_ago,
    MAX(CASE WHEN pct_change > 0 THEN pct_change ELSE 0 END) AS max_gain,
    MIN(CASE WHEN pct_change < 0 THEN pct_change ELSE 0 END) AS max_loss,
    AVG(ABS(pct_change)) AS avg_volatility,
    STDDEV(pct_change) AS volatility_stddev,
    COUNT(*) AS total_data_points,
    COUNT(CASE WHEN pct_change > 0.5 THEN 1 END) AS large_gains_count,
    COUNT(CASE WHEN pct_change < -0.5 THEN 1 END) AS large_losses_count,
    AVG(minutes_gap) AS avg_minutes_between_updates,
    MAX(minutes_gap) AS max_gap_minutes
FROM price_changes pc
GROUP BY pc.symbol, pc.name
ORDER BY pc.symbol;
        `;

        const { rows } = await pool.query(sql);
        
        const insights: AssetInsight[] = rows.map((row: any) => {
            const currentPrice = parseFloat(row.current_price);
            const price24hAgo = parseFloat(row.price_24h_ago);
            const change24h = ((currentPrice - price24hAgo) / price24hAgo * 100);
            const avgVol = parseFloat(row.avg_volatility);
            const maxGain = parseFloat(row.max_gain);
            const maxLoss = parseFloat(row.max_loss);
            const maxGap = parseFloat(row.max_gap_minutes);
            const largeGains = parseInt(row.large_gains_count);
            const largeLosses = parseInt(row.large_losses_count);
            const totalPoints = parseInt(row.total_data_points);
            
            // Determine trend
            let trend: 'bullish' | 'bearish' | 'stable' = 'stable';
            let trendStrength: 'strong' | 'modest' | 'weak' = 'weak';
            
            if (Math.abs(change24h) < 0.5) {
                trend = 'stable';
                trendStrength = 'weak';
            } else if (change24h > 0) {
                trend = 'bullish';
                trendStrength = change24h > 2 ? 'strong' : 'modest';
            } else {
                trend = 'bearish';
                trendStrength = change24h < -2 ? 'strong' : 'modest';
            }
            
            // Determine volatility
            let volatility: 'low' | 'moderate' | 'high' = 'low';
            if (avgVol >= 0.3) volatility = 'high';
            else if (avgVol >= 0.1) volatility = 'moderate';
            
            // Detect anomalies
            const anomalies: string[] = [];
            
            if (maxGain > 1.0) {
                anomalies.push(`Sharp upward spike of +${maxGain.toFixed(2)}%`);
            }
            if (maxLoss < -1.0) {
                anomalies.push(`Sharp downward drop of ${maxLoss.toFixed(2)}%`);
            }
            if (maxGap > 30) {
                anomalies.push(`Data gap detected (${maxGap.toFixed(0)} min between updates)`);
            }
            if ((largeGains + largeLosses) / totalPoints > 0.15) {
                anomalies.push(`Unusual volatility pattern (${(((largeGains + largeLosses) / totalPoints) * 100).toFixed(1)}% large swings)`);
            }
            
            // Generate description
            let description = '';
            if (trend === 'stable') {
                description = 'Price has remained relatively flat over 24 hours. The market is consolidating with minimal directional movement.';
            } else if (trend === 'bullish') {
                if (trendStrength === 'strong') {
                    description = 'Significant upward momentum. Buyers are in strong control, pushing prices higher.';
                } else {
                    description = 'Modest upward trend. Buyers are in control, gradually pushing prices higher.';
                }
            } else {
                if (trendStrength === 'strong') {
                    description = 'Significant downward pressure. Sellers are dominating, driving prices lower.';
                } else {
                    description = 'Modest downward trend. Sellers are in control, gradually pushing prices lower.';
                }
            }
            
            return {
                symbol: row.symbol,
                name: row.name,
                currentPrice,
                price24hAgo,
                change24h,
                trend,
                trendStrength,
                volatility,
                avgVolatility: avgVol,
                maxGain,
                maxLoss,
                anomalies,
                description
            };
        });
        
        // Generate overall market summary
        const overallTrend = insights.every(i => i.trend === 'bullish') ? 'bullish' :
                            insights.every(i => i.trend === 'bearish') ? 'bearish' : 'mixed';
        
        return NextResponse.json({ 
            insights,
            summary: {
                overallTrend,
                timestamp: new Date().toISOString()
            }
        });
        
    } catch (error) {
        console.error('Error generating insights:', error);
        return NextResponse.json(
            { error: 'Failed to generate insights' },
            { status: 500 }
        );
    }
}

