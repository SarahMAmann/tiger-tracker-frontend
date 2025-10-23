import { NextResponse } from 'next/server';
import { getPool } from '../../lib/db';


export const revalidate = 0; // disable caching


export async function GET() {
    const pool = getPool();
    const sql = `
WITH b AS (
SELECT a.symbol,
time_bucket('5 minutes', t.ts) AS bucket,
avg(t.price_usd) AS avg_price
FROM transactions t
JOIN assets a ON a.id = t.asset_id
WHERE t.ts >= now() - interval '24 hours'
GROUP BY a.symbol, bucket
)
SELECT symbol,
bucket AT TIME ZONE 'UTC' AS bucket_utc,
avg_price
FROM b
ORDER BY symbol, bucket_utc;
`;
    const { rows } = await pool.query(sql);


    // reshape into { [symbol]: { timestamps: [], values: [] } }
    const bySymbol: Record<string, { t: string[]; v: number[] }> = {};
    for (const r of rows as { symbol: string; bucket_utc: string; avg_price: number }[]) {
        const s = r.symbol;
        if (!bySymbol[s]) bySymbol[s] = { t: [], v: [] };
        bySymbol[s].t.push(new Date(r.bucket_utc).toISOString());
        bySymbol[s].v.push(Number(r.avg_price));
    }
    return NextResponse.json({ data: bySymbol });
}