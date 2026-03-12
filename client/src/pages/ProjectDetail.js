/**
 * Project Detail Page
 */

import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Edit2, Users, DollarSign, Calendar } from 'lucide-react';
import api from '../services/api';
import { formatCurrency, formatDate, getStatusBadgeColor } from '../utils/formatters';

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['project', id],
    queryFn: async () => {
      const response = await api.get(`/projects/${id}`);
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

  const project = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/projects')}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-bold text-gray-900">{project?.name}</h1>
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeColor(project?.status)}`}>
                {project?.status}
              </span>
            </div>
            <p className="text-gray-500">{project?.description}</p>
          </div>
        </div>
        <button className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition">
          <Edit2 className="w-4 h-4" />
          <span>Edit</span>
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-blue-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Budget</p>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(project?.budget)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-red-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Spent</p>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(project?.total_expense || 0)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-emerald-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Income</p>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(project?.total_income || 0)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Members</p>
              <p className="text-xl font-bold text-gray-900">{project?.members?.length || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Project Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-1">Client Name</h4>
            <p className="text-gray-900">{project?.client_name || 'N/A'}</p>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-1">Client Phone</h4>
            <p className="text-gray-900">{project?.client_phone || 'N/A'}</p>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-1">Address</h4>
            <p className="text-gray-900">{project?.address || 'N/A'}</p>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-1">Start Date</h4>
            <p className="text-gray-900">{formatDate(project?.start_date)}</p>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-1">End Date</h4>
            <p className="text-gray-900">{formatDate(project?.end_date)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
