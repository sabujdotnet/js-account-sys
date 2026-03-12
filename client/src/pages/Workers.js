/**
 * Workers Page
 */

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Users } from 'lucide-react';
import api from '../services/api';
import { formatCurrency } from '../utils/formatters';

export default function Workers() {
  const { data, isLoading } = useQuery({
    queryKey: ['workers'],
    queryFn: async () => {
      const response = await api.get('/workers');
      return response.data.data;
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Workers</h1>
          <p className="text-gray-500">Manage your construction workers</p>
        </div>
        <button className="flex items-center justify-center space-x-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition">
          <Plus className="w-5 h-5" />
          <span>Add Worker</span>
        </button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-4" />
              <div className="h-3 bg-gray-200 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : data?.workers?.length === 0 ? (
        <div className="text-center py-12">
          <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No workers found</h3>
          <p className="text-gray-500">Add your first worker to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {data?.workers?.map((worker) => (
            <div key={worker.id} className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition">
              <div className="flex items-center space-x-4 mb-4">
                <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                  <span className="text-emerald-700 font-semibold text-lg">
                    {worker.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{worker.name}</h3>
                  <p className="text-sm text-gray-500">{worker.role || 'Worker'}</p>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Daily Rate:</span>
                  <span className="font-medium">{formatCurrency(worker.daily_rate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Hourly Rate:</span>
                  <span className="font-medium">{formatCurrency(worker.hourly_rate)}</span>
                </div>
                {worker.phone && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Phone:</span>
                    <span className="font-medium">{worker.phone}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
