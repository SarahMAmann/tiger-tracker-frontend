import { NextResponse } from 'next/server';
import { getPool } from '../../lib/db';


export async function GET() {
    const sql = `
SELECT a.symbol, last(t.price_usd, t.ts) AS price
FROM transactions t
JOIN assets a ON a.id = t.asset_id
GROUP BY a.symbol
ORDER BY a.symbol;
`;
    const { rows } = await getPool().query(sql);
    return NextResponse.json({ data: rows });
}