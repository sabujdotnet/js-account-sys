/**
 * Main Layout Component
 */

import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Receipt,
  FolderOpen,
  Users,
  FileText,
  Image,
  Settings,
  LogOut,
  Menu,
  X,
  Briefcase,
  PieChart,
  Calculator,
  UserCog,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { getRoleDisplayName, getRoleBadgeColor } from '../../utils/formatters';

// Navigation items
const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['director', 'manager', 'engineer'] },
  { path: '/transactions', label: 'Transactions', icon: Receipt, roles: ['director', 'manager', 'engineer'] },
  { path: '/projects', label: 'Projects', icon: FolderOpen, roles: ['director', 'manager', 'engineer'] },
  { path: '/workers', label: 'Workers', icon: Users, roles: ['director', 'manager', 'engineer'] },
  { path: '/invoices', label: 'Invoices', icon: FileText, roles: ['director', 'manager', 'engineer'] },
  { path: '/photos', label: 'Photos', icon: Image, roles: ['director', 'manager', 'engineer'] },
  { path: '/budget', label: 'Budget', icon: Calculator, roles: ['director', 'manager', 'engineer'] },
  { path: '/reports', label: 'Reports', icon: PieChart, roles: ['director', 'manager', 'engineer'] },
  { path: '/users', label: 'Users', icon: UserCog, roles: ['director', 'manager'] },
  { path: '/settings', label: 'Settings', icon: Settings, roles: ['director', 'manager', 'engineer'] },
];

export default function MainLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Filter nav items based on user role
  const filteredNavItems = navItems.filter(
    (item) => user && item.roles.includes(user.role)
  );

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar - Desktop */}
      <aside
        className={`hidden lg:flex flex-col bg-white border-r border-gray-200 transition-all duration-300 ${
          isSidebarOpen ? 'w-64' : 'w-20'
        }`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-center border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <Briefcase className="w-6 h-6 text-white" />
            </div>
            {isSidebarOpen && (
              <div className="overflow-hidden">
                <h1 className="font-bold text-gray-900 text-sm whitespace-nowrap">J&S Accounting</h1>
                <p className="text-xs text-gray-500 whitespace-nowrap">BD</p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1 px-3">
            {filteredNavItems.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center space-x-3 px-3 py-2.5 rounded-lg transition ${
                      isActive
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`
                  }
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  {isSidebarOpen && <span className="text-sm font-medium whitespace-nowrap">{item.label}</span>}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* User Profile */}
        <div className="border-t border-gray-200 p-4">
          <div className={`flex items-center ${isSidebarOpen ? 'space-x-3' : 'justify-center'}`}>
            <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-emerald-700 font-semibold">
                {user?.name?.charAt(0).toUpperCase()}
              </span>
            </div>
            {isSidebarOpen && (
              <div className="overflow-hidden">
                <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getRoleBadgeColor(user?.role)}`}>
                  {getRoleDisplayName(user?.role)}
                </span>
              </div>
            )}
          </div>
          
          <button
            onClick={handleLogout}
            className={`mt-3 flex items-center text-gray-600 hover:text-red-600 transition ${
              isSidebarOpen ? 'space-x-2' : 'justify-center w-full'
            }`}
          >
            <LogOut className="w-5 h-5" />
            {isSidebarOpen && <span className="text-sm">Logout</span>}
          </button>
        </div>

        {/* Toggle Button */}
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="absolute top-4 -right-3 w-6 h-6 bg-emerald-600 rounded-full flex items-center justify-center text-white shadow-lg hover:bg-emerald-700"
        >
          {isSidebarOpen ? <X className="w-3 h-3" /> : <Menu className="w-3 h-3" />}
        </button>
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 z-50 flex items-center justify-between px-4">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
            <Briefcase className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-gray-900">J&S Accounting BD</span>
        </div>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 text-gray-600 hover:text-gray-900"
        >
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black bg-opacity-50" onClick={() => setIsMobileMenuOpen(false)}>
          <div className="absolute top-16 left-0 right-0 bg-white border-b border-gray-200 p-4" onClick={(e) => e.stopPropagation()}>
            <nav className="space-y-1">
              {filteredNavItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center space-x-3 px-3 py-2.5 rounded-lg transition ${
                      isActive
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`
                  }
                >
                  <item.icon className="w-5 h-5" />
                  <span className="text-sm font-medium">{item.label}</span>
                </NavLink>
              ))}
            </nav>
            <div className="mt-4 pt-4 border-t border-gray-200">
              <button
                onClick={handleLogout}
                className="flex items-center space-x-3 px-3 py-2.5 text-red-600 w-full"
              >
                <LogOut className="w-5 h-5" />
                <span className="text-sm font-medium">Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 lg:ml-0 pt-16 lg:pt-0">
        <div className="p-4 lg:p-8 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
