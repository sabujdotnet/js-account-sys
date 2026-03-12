/**
 * Dashboard Page
 */

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Users,
  FileText,
  Briefcase,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import api from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { formatCurrency, formatDate } from '../utils/formatters';

// Stats Card Component
function StatsCard({ title, value, icon: Icon, trend, trendValue, color }) {
  const colorClasses = {
    emerald: 'bg-emerald-100 text-emerald-600',
    red: 'bg-red-100 text-red-600',
    blue: 'bg-blue-100 text-blue-600',
    amber: 'bg-amber-100 text-amber-600',
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-gray-500 text-sm">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {trend && (
            <div className={`flex items-center mt-2 text-sm ${trend === 'up' ? 'text-emerald-600' : 'text-red-600'}`}>
              {trend === 'up' ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingDown className="w-4 h-4 mr-1" />}
              <span>{trendValue}</span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}

// Recent Transactions Component
function RecentTransactions() {
  const { data, isLoading } = useQuery({
    queryKey: ['recent-transactions'],
    queryFn: async () => {
      const response = await api.get('/dashboard/recent-transactions?limit=5');
      return response.data.data;
    },
  });

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-gray-100 rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Transactions</h3>
      <div className="space-y-3">
        {data?.map((transaction) => (
          <div
            key={transaction.id}
            className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition"
          >
            <div className="flex items-center space-x-3">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  transaction.type === 'income'
                    ? 'bg-emerald-100 text-emerald-600'
                    : 'bg-red-100 text-red-600'
                }`}
              >
                {transaction.type === 'income' ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
              </div>
              <div>
                <p className="font-medium text-gray-900">{transaction.description}</p>
                <p className="text-sm text-gray-500">{transaction.category}</p>
              </div>
            </div>
            <div className="text-right">
              <p
                className={`font-semibold ${
                  transaction.type === 'income' ? 'text-emerald-600' : 'text-red-600'
                }`}
              >
                {transaction.type === 'income' ? '+' : '-'}
                {formatCurrency(transaction.amount)}
              </p>
              <p className="text-sm text-gray-500">{formatDate(transaction.transaction_date)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Alerts Component
function Alerts() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-alerts'],
    queryFn: async () => {
      const response = await api.get('/dashboard/alerts');
      return response.data.data;
    },
  });

  if (isLoading || !data || data.length === 0) return null;

  const alertColors = {
    error: 'bg-red-50 border-red-200 text-red-800',
    warning: 'bg-amber-50 border-amber-200 text-amber-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
  };

  return (
    <div className="space-y-3">
      {data.map((alert, index) => (
        <div
          key={index}
          className={`p-4 rounded-lg border ${alertColors[alert.severity]} flex items-start space-x-3`}
        >
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">{alert.title}</p>
            <p className="text-sm opacity-90">{alert.message}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: async () => {
      const response = await api.get('/dashboard/summary');
      return response.data.data;
    },
  });

  const { data: monthlyData, isLoading: monthlyLoading } = useQuery({
    queryKey: ['monthly-chart'],
    queryFn: async () => {
      const response = await api.get('/dashboard/charts/monthly');
      return response.data.data;
    },
  });

  const { data: categoryData, isLoading: categoryLoading } = useQuery({
    queryKey: ['category-chart'],
    queryFn: async () => {
      const response = await api.get('/dashboard/charts/category');
      return response.data.data;
    },
  });

  const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500">Welcome back, {user?.name}!</p>
        </div>
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <Clock className="w-4 h-4" />
          <span>{new Date().toLocaleDateString('en-BD', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
        </div>
      </div>

      {/* Alerts */}
      <Alerts />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Today's Income"
          value={summaryLoading ? '...' : formatCurrency(summary?.today?.income || 0)}
          icon={Wallet}
          color="emerald"
        />
        <StatsCard
          title="Today's Expense"
          value={summaryLoading ? '...' : formatCurrency(summary?.today?.expense || 0)}
          icon={TrendingDown}
          color="red"
        />
        <StatsCard
          title="Total Projects"
          value={summaryLoading ? '...' : summary?.counts?.projects || 0}
          icon={Briefcase}
          color="blue"
        />
        <StatsCard
          title="Total Workers"
          value={summaryLoading ? '...' : summary?.counts?.workers || 0}
          icon={Users}
          color="amber"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Chart */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Overview</h3>
          <div className="h-64">
            {monthlyLoading ? (
              <div className="animate-pulse h-full bg-gray-100 rounded" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="monthName" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Bar dataKey="income" fill="#10B981" name="Income" />
                  <Bar dataKey="expense" fill="#EF4444" name="Expense" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Category Chart */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Expenses by Category</h3>
          <div className="h-64">
            {categoryLoading ? (
              <div className="animate-pulse h-full bg-gray-100 rounded" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ category, percent }) => `${category} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="total"
                    nameKey="category"
                  >
                    {categoryData?.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RecentTransactions />
        </div>
        
        {/* Quick Stats */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Stats</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600">This Month Income</span>
              <span className="font-semibold text-emerald-600">
                {formatCurrency(summary?.thisMonth?.income || 0)}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600">This Month Expense</span>
              <span className="font-semibold text-red-600">
                {formatCurrency(summary?.thisMonth?.expense || 0)}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600">Pending Labor</span>
              <span className="font-semibold text-amber-600">
                {formatCurrency(summary?.pendingLabor || 0)}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600">Overdue Invoices</span>
              <span className="font-semibold text-red-600">
                {summary?.overdueInvoices?.count || 0} ({formatCurrency(summary?.overdueInvoices?.amount || 0)})
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
