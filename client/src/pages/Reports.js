/**
 * Reports Page
 */

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, FileText, PieChart, BarChart3 } from 'lucide-react';
import api from '../services/api';
import { formatCurrency } from '../utils/formatters';

export default function Reports() {
  const [period, setPeriod] = useState('month');

  const { data, isLoading } = useQuery({
    queryKey: ['financial-overview', period],
    queryFn: async () => {
      const response = await api.get(`/dashboard/financial-overview?period=${period}`);
      return response.data.data;
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-gray-500">View and export financial reports</p>
        </div>
        <div className="flex space-x-2">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
          >
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="year">This Year</option>
          </select>
          <button className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition">
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-3 bg-emerald-100 rounded-lg">
              <BarChart3 className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Income</p>
              <p className="text-2xl font-bold text-emerald-600">
                {isLoading ? '...' : formatCurrency(data?.summary?.totalIncome || 0)}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-3 bg-red-100 rounded-lg">
              <BarChart3 className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Expense</p>
              <p className="text-2xl font-bold text-red-600">
                {isLoading ? '...' : formatCurrency(data?.summary?.totalExpense || 0)}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <PieChart className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Net Profit</p>
              <p className={`text-2xl font-bold ${(data?.summary?.netProfit || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {isLoading ? '...' : formatCurrency(data?.summary?.netProfit || 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Top Expenses */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Expense Categories</h3>
        {isLoading ? (
          <div className="animate-pulse space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-4 bg-gray-100 rounded" />
            ))}
          </div>
        ) : data?.topExpenses?.length === 0 ? (
          <p className="text-gray-500">No expense data available</p>
        ) : (
          <div className="space-y-3">
            {data?.topExpenses?.map((expense, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="font-medium text-gray-900">{expense.category}</span>
                <span className="text-red-600 font-semibold">{formatCurrency(expense.total)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
