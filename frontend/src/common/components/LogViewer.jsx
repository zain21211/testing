import React, { useState, useEffect } from 'react';
import axios from 'axios';

const LogViewer = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [filters, setFilters] = useState({
        type: 'api',
        limit: 50,
        startDate: '',
        endDate: ''
    });

    const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

    const fetchLogs = async () => {
        setLoading(true);
        setError(null);

        try {
            const params = new URLSearchParams();
            Object.entries(filters).forEach(([key, value]) => {
                if (value) params.append(key, value);
            });

            const response = await axios.get(`${API_BASE_URL}/logs/${filters.type}?${params}`);
            setLogs(response.data.data || []);
        } catch (err) {
            setError(err.response?.data?.error?.message || 'Failed to fetch logs');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, [filters.type]);

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const formatTimestamp = (timestamp) => {
        return new Date(timestamp).toLocaleString();
    };

    const getStatusColor = (status) => {
        if (status >= 200 && status < 300) return 'text-green-600';
        if (status >= 300 && status < 400) return 'text-blue-600';
        if (status >= 400 && status < 500) return 'text-yellow-600';
        if (status >= 500) return 'text-red-600';
        return 'text-gray-600';
    };

    const renderApiLog = (log) => (
        <div key={log._id} className="border-b border-gray-200 p-4 hover:bg-gray-50">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-4">
                    <span className={`font-mono text-sm px-2 py-1 rounded ${getStatusColor(log.responseStatus)} bg-gray-100`}>
                        {log.method} {log.responseStatus}
                    </span>
                    <span className="text-sm text-gray-600">{log.endpoint}</span>
                    <span className="text-xs text-gray-500">{log.username || 'Anonymous'}</span>
                </div>
                <div className="text-xs text-gray-500">
                    {formatTimestamp(log.timestamp)}
                </div>
            </div>

            <div className="text-sm text-gray-700 mb-2">
                <strong>URL:</strong> {log.url}
            </div>

            <div className="flex items-center space-x-4 text-xs text-gray-500">
                <span>Response Time: {log.responseTime}ms</span>
                <span>IP: {log.ipAddress}</span>
                <span className={log.success ? 'text-green-600' : 'text-red-600'}>
                    {log.success ? 'Success' : 'Failed'}
                </span>
            </div>

            {log.errorDetails && (
                <div className="mt-2 p-2 bg-red-50 rounded text-xs text-red-700">
                    <strong>Error:</strong> {JSON.stringify(log.errorDetails, null, 2)}
                </div>
            )}
        </div>
    );

    const renderErrorLog = (log) => (
        <div key={log._id} className="border-b border-gray-200 p-4 hover:bg-gray-50">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-4">
                    <span className={`font-mono text-sm px-2 py-1 rounded ${log.severity === 'CRITICAL' ? 'bg-red-100 text-red-800' :
                            log.severity === 'HIGH' ? 'bg-orange-100 text-orange-800' :
                                log.severity === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-gray-100 text-gray-800'
                        }`}>
                        {log.severity}
                    </span>
                    <span className="text-sm text-gray-600">{log.errorType}</span>
                    <span className="text-xs text-gray-500">{log.username || 'System'}</span>
                </div>
                <div className="text-xs text-gray-500">
                    {formatTimestamp(log.timestamp)}
                </div>
            </div>

            <div className="text-sm text-gray-700 mb-2">
                <strong>Message:</strong> {log.errorMessage}
            </div>

            <div className="flex items-center space-x-4 text-xs text-gray-500">
                <span>Code: {log.errorCode}</span>
                <span>Endpoint: {log.endpoint || 'N/A'}</span>
                <span className={log.resolved ? 'text-green-600' : 'text-red-600'}>
                    {log.resolved ? 'Resolved' : 'Unresolved'}
                </span>
            </div>
        </div>
    );

    const renderActivityLog = (log) => (
        <div key={log._id} className="border-b border-gray-200 p-4 hover:bg-gray-50">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-4">
                    <span className="font-mono text-sm px-2 py-1 rounded bg-blue-100 text-blue-800">
                        {log.activity}
                    </span>
                    <span className="text-sm text-gray-600">{log.description}</span>
                    <span className="text-xs text-gray-500">{log.username || 'Anonymous'}</span>
                </div>
                <div className="text-xs text-gray-500">
                    {formatTimestamp(log.timestamp)}
                </div>
            </div>

            <div className="flex items-center space-x-4 text-xs text-gray-500">
                <span>Type: {log.userType || 'N/A'}</span>
                <span>IP: {log.ipAddress}</span>
                <span className={log.success ? 'text-green-600' : 'text-red-600'}>
                    {log.success ? 'Success' : 'Failed'}
                </span>
            </div>
        </div>
    );

    return (
        <div className="max-w-7xl mx-auto p-6">
            <div className="bg-white shadow-lg rounded-lg">
                <div className="p-6 border-b border-gray-200">
                    <h1 className="text-2xl font-bold text-gray-900 mb-4">System Logs</h1>

                    {/* Filters */}
                    <div className="flex flex-wrap gap-4 mb-4">
                        <select
                            value={filters.type}
                            onChange={(e) => handleFilterChange('type', e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="api">API Logs</option>
                            <option value="errors">Error Logs</option>
                            <option value="activities">User Activities</option>
                        </select>

                        <input
                            type="number"
                            placeholder="Limit"
                            value={filters.limit}
                            onChange={(e) => handleFilterChange('limit', e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />

                        <input
                            type="date"
                            placeholder="Start Date"
                            value={filters.startDate}
                            onChange={(e) => handleFilterChange('startDate', e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />

                        <input
                            type="date"
                            placeholder="End Date"
                            value={filters.endDate}
                            onChange={(e) => handleFilterChange('endDate', e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />

                        <button
                            onClick={fetchLogs}
                            disabled={loading}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                        >
                            {loading ? 'Loading...' : 'Refresh'}
                        </button>
                    </div>
                </div>

                {/* Logs List */}
                <div className="max-h-96 overflow-y-auto">
                    {error && (
                        <div className="p-4 bg-red-50 border-l-4 border-red-400">
                            <p className="text-red-700">{error}</p>
                        </div>
                    )}

                    {loading && (
                        <div className="p-8 text-center">
                            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                            <p className="mt-2 text-gray-600">Loading logs...</p>
                        </div>
                    )}

                    {!loading && logs.length === 0 && (
                        <div className="p-8 text-center text-gray-500">
                            No logs found for the selected criteria.
                        </div>
                    )}

                    {!loading && logs.length > 0 && (
                        <div>
                            {filters.type === 'api' && logs.map(renderApiLog)}
                            {filters.type === 'errors' && logs.map(renderErrorLog)}
                            {filters.type === 'activities' && logs.map(renderActivityLog)}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-200 bg-gray-50">
                    <p className="text-sm text-gray-600">
                        Showing {logs.length} logs • Last updated: {new Date().toLocaleString()}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default LogViewer;
