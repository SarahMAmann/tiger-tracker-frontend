// lib/db.ts — server-only pg Pool
import { Pool } from 'pg';


let _pool: Pool | null = null;


export function getPool() {
    if (!_pool) {
        const url = process.env.TIMESCALE_SERVICE_URL;
        if (!url) throw new Error('TIMESCALE_SERVICE_URL not set');
        _pool = new Pool({ connectionString: url, ssl: { rejectUnauthorized: false } });
    }
    return _pool;
}