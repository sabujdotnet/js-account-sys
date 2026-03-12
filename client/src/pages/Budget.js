/**
 * Budget Page
 */

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Calculator, TrendingUp, TrendingDown } from 'lucide-react';
import api from '../services/api';
import { formatCurrency } from '../utils/formatters';

export default function Budget() {
  const { data, isLoading } = useQuery({
    queryKey: ['budgets'],
    queryFn: async () => {
      const response = await api.get('/budgets');
      return response.data.data;
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Budget</h1>
          <p className="text-gray-500">Manage project budgets</p>
        </div>
        <button className="flex items-center justify-center space-x-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition">
          <Plus className="w-5 h-5" />
          <span>Create Budget</span>
        </button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-4" />
              <div className="h-3 bg-gray-200 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : data?.budgets?.length === 0 ? (
        <div className="text-center py-12">
          <Calculator className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No budgets found</h3>
          <p className="text-gray-500">Create your first budget to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {data?.budgets?.map((budget) => (
            <div key={budget.id} className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{budget.name}</h3>
              <p className="text-gray-500 text-sm mb-4">{budget.description || 'No description'}</p>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Estimated:</span>
                  <span className="font-medium">{formatCurrency(budget.total_estimated)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Actual:</span>
                  <span className="font-medium text-red-600">{formatCurrency(budget.total_actual)}</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-500 transition-all"
                    style={{ 
                      width: `${Math.min(100, (budget.total_actual / budget.total_estimated) * 100)}%` 
                    }}
                  />
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Progress</span>
                  <span className="font-medium">
                    {((budget.total_actual / budget.total_estimated) * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
