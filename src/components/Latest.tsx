'use client';
import useSWR from 'swr';
import { useState, useEffect } from 'react';


const fetcher = (url: string) => fetch(url).then(r => r.json());


export default function Latest() {
    const { data } = useSWR('/api/latest', fetcher, { refreshInterval: 30_000 });
    const items: { symbol: string; price: number }[] = data?.data ?? [];
    const [previousPrices, setPreviousPrices] = useState<Record<string, number>>({});
    const [priceChanges, setPriceChanges] = useState<Record<string, number>>({});

    useEffect(() => {
        if (items.length > 0) {
            const changes: Record<string, number> = {};
            items.forEach(item => {
                if (previousPrices[item.symbol]) {
                    changes[item.symbol] = item.price - previousPrices[item.symbol];
                }
            });
            setPriceChanges(changes);
            setPreviousPrices(
                items.reduce((acc, item) => ({ ...acc, [item.symbol]: item.price }), {})
            );
        }
    }, [items]);

    const formatPrice = (price: number) => {
        if (price >= 1000) {
            return `$${(price / 1000).toFixed(1)}K`;
        }
        return `$${price.toLocaleString()}`;
    };

    const getChangeColor = (change: number) => {
        if (change > 0) return 'text-green-400';
        if (change < 0) return 'text-red-400';
        return 'text-gray-400';
    };

    const getChangeIcon = (change: number) => {
        if (change > 0) return '↗';
        if (change < 0) return '↘';
        return '→';
    };

    return (
        <div className="space-y-3">
            {items.map((item) => {
                const change = priceChanges[item.symbol] || 0;
                const changePercent = previousPrices[item.symbol] 
                    ? ((change / previousPrices[item.symbol]) * 100).toFixed(2)
                    : '0.00';
                
                return (
                    <div 
                        key={item.symbol} 
                        className="bg-gray-700 rounded-lg p-4 border border-gray-600 hover:border-gray-500 transition-colors"
                    >
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-2">
                                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                                <span className="font-mono font-semibold text-lg text-gray-200">
                                    {item.symbol}
                                </span>
                            </div>
                            <div className="text-right">
                                <div className="text-lg font-mono font-bold text-white">
                                    {formatPrice(item.price)}
                                </div>
                                {change !== 0 && (
                                    <div className={`text-xs font-mono ${getChangeColor(change)}`}>
                                        {getChangeIcon(change)} {changePercent}%
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        <div className="flex justify-between text-xs text-gray-400">
                            <span>USD</span>
                            <span className="font-mono">
                                {item.price.toLocaleString('en-US', {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2
                                })}
                            </span>
                        </div>
                    </div>
                );
            })}
            
            {items.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                    <div className="animate-pulse">Loading prices...</div>
                </div>
            )}
        </div>
    );
}