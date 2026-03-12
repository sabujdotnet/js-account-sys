/**
 * Settings Page
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  User,
  Lock,
  Cloud,
  Database,
  Download,
  Upload,
  Check,
  X,
  ExternalLink,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useAuth } from '../hooks/useAuth';

// Profile Tab
function ProfileTab() {
  const { user, updateProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await updateProfile(formData);
      toast.success('Profile updated successfully');
      setIsEditing(false);
    } catch (error) {
      toast.error('Failed to update profile');
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Profile Information</h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            disabled={!isEditing}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none disabled:bg-gray-50"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            type="email"
            value={user?.email || ''}
            disabled
            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            disabled={!isEditing}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none disabled:bg-gray-50"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
          <input
            type="text"
            value={user?.role || ''}
            disabled
            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 capitalize"
          />
        </div>
        
        <div className="flex justify-end space-x-3 pt-4">
          {isEditing ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  setFormData({ name: user?.name || '', phone: user?.phone || '' });
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition"
              >
                Save Changes
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition"
            >
              Edit Profile
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

// Password Tab
function PasswordTab() {
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.newPassword !== formData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    
    if (formData.newPassword.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }
    
    setIsLoading(true);
    
    try {
      await api.post('/auth/change-password', {
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword,
      });
      toast.success('Password changed successfully');
      setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to change password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Change Password</h3>
      
      <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
          <input
            type="password"
            value={formData.currentPassword}
            onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
          <input
            type="password"
            value={formData.newPassword}
            onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
            required
            minLength={6}
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
          <input
            type="password"
            value={formData.confirmPassword}
            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
            required
          />
        </div>
        
        <button
          type="submit"
          disabled={isLoading}
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition disabled:opacity-50"
        >
          {isLoading ? 'Changing...' : 'Change Password'}
        </button>
      </form>
    </div>
  );
}

// Backup Tab
function BackupTab() {
  const queryClient = useQueryClient();
  
  const { data: backupStatus, isLoading } = useQuery({
    queryKey: ['backup-status'],
    queryFn: async () => {
      const response = await api.get('/backup/status');
      return response.data.data;
    },
  });

  const connectGoogleDrive = async () => {
    try {
      const response = await api.get('/backup/google/auth');
      window.location.href = response.data.data.authUrl;
    } catch (error) {
      toast.error('Failed to get Google Drive authorization');
    }
  };

  const disconnectGoogleDrive = useMutation({
    mutationFn: () => api.post('/backup/google/disconnect'),
    onSuccess: () => {
      toast.success('Google Drive disconnected');
      queryClient.invalidateQueries(['backup-status']);
    },
    onError: () => {
      toast.error('Failed to disconnect Google Drive');
    },
  });

  const backupToDrive = useMutation({
    mutationFn: () => api.post('/backup/google/backup'),
    onSuccess: () => {
      toast.success('Backup completed successfully');
      queryClient.invalidateQueries(['backup-status']);
    },
    onError: () => {
      toast.error('Backup failed');
    },
  });

  const exportData = async () => {
    try {
      const response = await api.post('/backup/export', {}, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `js-accounting-backup-${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Data exported successfully');
    } catch (error) {
      toast.error('Failed to export data');
    }
  };

  return (
    <div className="space-y-6">
      {/* Google Drive */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Google Drive Backup</h3>
            <p className="text-gray-500 mt-1">Automatically backup your data to Google Drive</p>
          </div>
          <Cloud className={`w-8 h-8 ${backupStatus?.googleDrive?.connected ? 'text-emerald-500' : 'text-gray-400'}`} />
        </div>
        
        <div className="mt-4">
          {isLoading ? (
            <div className="animate-pulse h-4 bg-gray-100 rounded w-32" />
          ) : backupStatus?.googleDrive?.connected ? (
            <div className="flex items-center space-x-2 text-emerald-600">
              <Check className="w-5 h-5" />
              <span className="font-medium">Connected to Google Drive</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2 text-gray-500">
              <X className="w-5 h-5" />
              <span>Not connected</span>
            </div>
          )}
        </div>
        
        <div className="flex space-x-3 mt-4">
          {backupStatus?.googleDrive?.connected ? (
            <>
              <button
                onClick={() => backupToDrive.mutate()}
                disabled={backupToDrive.isPending}
                className="flex items-center space-x-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${backupToDrive.isPending ? 'animate-spin' : ''}`} />
                <span>{backupToDrive.isPending ? 'Backing up...' : 'Backup Now'}</span>
              </button>
              <button
                onClick={() => disconnectGoogleDrive.mutate()}
                disabled={disconnectGoogleDrive.isPending}
                className="px-4 py-2 text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition"
              >
                Disconnect
              </button>
            </>
          ) : (
            <button
              onClick={connectGoogleDrive}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Connect Google Drive</span>
            </button>
          )}
        </div>
      </div>

      {/* Manual Backup */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Manual Backup</h3>
            <p className="text-gray-500 mt-1">Export your data as a JSON file</p>
          </div>
          <Database className="w-8 h-8 text-gray-400" />
        </div>
        
        <div className="flex space-x-3 mt-4">
          <button
            onClick={exportData}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
          >
            <Download className="w-4 h-4" />
            <span>Export Data</span>
          </button>
        </div>
      </div>

      {/* Storage Info */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Storage Usage</h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Photos</span>
            <span className="font-medium">{backupStatus?.storage?.photosCount || 0} files</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Storage Used</span>
            <span className="font-medium">
              {backupStatus?.storage?.photosSize
                ? `${(backupStatus.storage.photosSize / 1024 / 1024).toFixed(2)} MB`
                : '0 MB'}
            </span>
          </div>
          {backupStatus?.lastBackup && (
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Last Backup</span>
              <span className="font-medium">{new Date(backupStatus.lastBackup).toLocaleString()}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Settings() {
  const [activeTab, setActiveTab] = useState('profile');

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'password', label: 'Password', icon: Lock },
    { id: 'backup', label: 'Backup & Sync', icon: Cloud },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500">Manage your account and preferences</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar */}
        <div className="lg:w-64">
          <nav className="space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition ${
                  activeTab === tab.id
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                <span className="font-medium">{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1">
          {activeTab === 'profile' && <ProfileTab />}
          {activeTab === 'password' && <PasswordTab />}
          {activeTab === 'backup' && <BackupTab />}
        </div>
      </div>
    </div>
  );
}
