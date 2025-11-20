'use client';
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then(r => r.json());

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

interface InsightsData {
    insights: AssetInsight[];
    summary: {
        overallTrend: string;
        timestamp: string;
    };
}

export default function Insights() {
    const { data, error, isLoading } = useSWR<InsightsData>('/api/insights', fetcher, { 
        refreshInterval: 60_000 // Refresh every minute
    });

    if (isLoading) {
        return (
            <div className="animate-pulse space-y-4">
                <div className="h-6 bg-gray-700 rounded w-1/2"></div>
                <div className="h-20 bg-gray-700 rounded"></div>
                <div className="h-20 bg-gray-700 rounded"></div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
                <p className="text-red-400 text-sm">Failed to load insights</p>
            </div>
        );
    }

    const getTrendIcon = (trend: string) => {
        switch (trend) {
            case 'bullish': return '📈';
            case 'bearish': return '📉';
            default: return '↔️';
        }
    };

    const getTrendColor = (trend: string) => {
        switch (trend) {
            case 'bullish': return 'text-green-400';
            case 'bearish': return 'text-red-400';
            default: return 'text-gray-400';
        }
    };

    const getVolatilityColor = (volatility: string) => {
        switch (volatility) {
            case 'high': return 'text-orange-400';
            case 'moderate': return 'text-yellow-400';
            default: return 'text-green-400';
        }
    };

    return (
        <div className="space-y-4">
            {/* Overall Market Summary */}
            <div className="bg-gradient-to-br from-blue-900/40 to-purple-900/40 border border-blue-700/50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-blue-300">AI Market Summary</h3>
                    <span className="text-xs text-blue-400/70">
                        {new Date(data.summary.timestamp).toLocaleTimeString()}
                    </span>
                </div>
                <div className="flex items-center space-x-2">
                    <span className="text-2xl">{getTrendIcon(data.summary.overallTrend)}</span>
                    <div>
                        <p className="text-sm text-gray-300">
                            Market is <span className={`font-semibold ${getTrendColor(data.summary.overallTrend)}`}>
                                {data.summary.overallTrend}
                            </span>
                        </p>
                    </div>
                </div>
            </div>

            {/* Individual Asset Insights */}
            {data.insights.map((insight) => (
                <div 
                    key={insight.symbol}
                    className="bg-gray-800/80 border border-gray-700 rounded-lg p-4 hover:border-gray-600 transition-all"
                >
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                        <div>
                            <div className="flex items-center space-x-2">
                                <span className="text-lg font-bold text-gray-200">
                                    {insight.symbol}
                                </span>
                                <span className="text-xs text-gray-500">{insight.name}</span>
                            </div>
                            <div className="flex items-center space-x-3 mt-1">
                                <span className={`text-xl ${getTrendColor(insight.trend)}`}>
                                    {getTrendIcon(insight.trend)}
                                </span>
                                <span className={`text-sm font-medium ${getTrendColor(insight.trend)}`}>
                                    {insight.trendStrength === 'strong' ? 'Strong ' : ''}
                                    {insight.trend.charAt(0).toUpperCase() + insight.trend.slice(1)}
                                </span>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className={`text-lg font-bold ${getTrendColor(insight.trend)}`}>
                                {insight.change24h >= 0 ? '+' : ''}{insight.change24h.toFixed(2)}%
                            </div>
                            <div className="text-xs text-gray-400">24h change</div>
                        </div>
                    </div>

                    {/* Description */}
                    <p className="text-sm text-gray-400 mb-3 leading-relaxed">
                        {insight.description}
                    </p>

                    {/* Metrics Row */}
                    <div className="grid grid-cols-2 gap-3 mb-3">
                        <div className="bg-gray-900/50 rounded p-2">
                            <div className="text-xs text-gray-500 mb-1">Current Price</div>
                            <div className="text-sm font-mono font-semibold text-white">
                                ${insight.currentPrice.toLocaleString()}
                            </div>
                        </div>
                        <div className="bg-gray-900/50 rounded p-2">
                            <div className="text-xs text-gray-500 mb-1">Volatility</div>
                            <div className={`text-sm font-semibold ${getVolatilityColor(insight.volatility)}`}>
                                {insight.volatility.toUpperCase()}
                            </div>
                        </div>
                    </div>

                    {/* Price Range */}
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                        <span>Max Gain: <span className="text-green-400">+{insight.maxGain.toFixed(2)}%</span></span>
                        <span>Max Loss: <span className="text-red-400">{insight.maxLoss.toFixed(2)}%</span></span>
                    </div>

                    {/* Anomalies */}
                    {insight.anomalies.length > 0 ? (
                        <div className="bg-yellow-900/20 border border-yellow-700/50 rounded p-3">
                            <div className="flex items-start space-x-2">
                                <span className="text-yellow-400 mt-0.5">⚠️</span>
                                <div className="flex-1">
                                    <div className="text-xs font-semibold text-yellow-300 mb-1">
                                        Anomalies Detected
                                    </div>
                                    <ul className="text-xs text-yellow-200/80 space-y-1">
                                        {insight.anomalies.map((anomaly, idx) => (
                                            <li key={idx}>• {anomaly}</li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-green-900/20 border border-green-700/50 rounded p-2 flex items-center space-x-2">
                            <span className="text-green-400">✓</span>
                            <span className="text-xs text-green-300">No anomalies detected</span>
                        </div>
                    )}
                </div>
            ))}

            {/* Info Footer */}
            <div className="text-center text-xs text-gray-500 pt-2">
                AI insights refresh every 60 seconds
            </div>
        </div>
    );
}

