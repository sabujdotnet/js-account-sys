/**
 * Transaction Detail Page
 */

import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Edit2, Trash2 } from 'lucide-react';
import api from '../services/api';
import { formatCurrency, formatDate } from '../utils/formatters';

export default function TransactionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['transaction', id],
    queryFn: async () => {
      const response = await api.get(`/transactions/${id}`);
      return response.data.data;
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse h-8 bg-gray-200 rounded w-1/3" />
        <div className="animate-pulse h-64 bg-gray-100 rounded" />
      </div>
    );
  }

  const transaction = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/transactions')}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Transaction Details</h1>
            <p className="text-gray-500">{transaction?.description}</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <button className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition">
            <Edit2 className="w-4 h-4" />
            <span>Edit</span>
          </button>
          <button className="flex items-center space-x-2 px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition">
            <Trash2 className="w-4 h-4" />
            <span>Delete</span>
          </button>
        </div>
      </div>

      {/* Details Card */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">Amount</h3>
            <p className={`text-2xl font-bold ${transaction?.type === 'income' ? 'text-emerald-600' : 'text-red-600'}`}>
              {transaction?.type === 'income' ? '+' : '-'}{formatCurrency(transaction?.amount)}
            </p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">Type</h3>
            <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
              transaction?.type === 'income' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
            }`}>
              {transaction?.type}
            </span>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">Category</h3>
            <p className="text-lg text-gray-900">{transaction?.category}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">Date</h3>
            <p className="text-lg text-gray-900">{formatDate(transaction?.transaction_date)}</p>
          </div>
          {transaction?.project_name && (
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Project</h3>
              <p className="text-lg text-gray-900">{transaction.project_name}</p>
            </div>
          )}
          {transaction?.vat_amount > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">VAT ({transaction?.vat_rate}%)</h3>
              <p className="text-lg text-gray-900">{formatCurrency(transaction.vat_amount)}</p>
            </div>
          )}
        </div>

        {transaction?.photos && transaction.photos.length > 0 && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-sm font-medium text-gray-500 mb-4">Attached Photos</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {transaction.photos.map((photo) => (
                <div key={photo.id} className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                  <img
                    src={`${process.env.REACT_APP_API_URL || ''}${photo.filePath}`}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
