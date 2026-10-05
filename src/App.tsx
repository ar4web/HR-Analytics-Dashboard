import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Users, UserCheck, UserPlus, TrendingDown, DollarSign,
  Calendar, Clock, Building2, Download, Bell, Settings,
  Search, ChevronDown, BarChart3, PieChart, Activity,
  MapPin, Briefcase, Award, AlertCircle
} from 'lucide-react';
import { KPICard } from './components/KPICard';
import { BarChart } from './components/BarChart';
import { DonutChart } from './components/DonutChart';
import { LineChart } from './components/LineChart';
import { StackedBarChart } from './components/StackedBarChart';
import { FilterBar } from './components/FilterBar';
import {
  kpiData, departmentBreakdown, hiringTrends, attritionData,
  demographicsData, attendanceData, performanceData, locationData,
  salaryDistribution, leaveData, recentActivities, departments, locations
} from './data/hrData';

export default function App() {
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({
    month: 'all',
    department: 'all',
    location: 'all',
    gender: 'all',
    status: 'all',
  });

  const filters = [
    {
      key: 'month',
      label: 'Month',
      options: [
        { label: 'All Months', value: 'all' },
        { label: 'January', value: 'jan' },
        { label: 'February', value: 'feb' },
        { label: 'March', value: 'mar' },
        { label: 'April', value: 'apr' },
        { label: 'May', value: 'may' },
        { label: 'June', value: 'jun' },
        { label: 'July', value: 'jul' },
        { label: 'August', value: 'aug' },
        { label: 'September', value: 'sep' },
        { label: 'October', value: 'oct' },
        { label: 'November', value: 'nov' },
        { label: 'December', value: 'dec' },
      ],
    },
    {
      key: 'department',
      label: 'Department',
      options: [
        { label: 'All Departments', value: 'all' },
        ...departments.map(d => ({ label: d, value: d.toLowerCase() })),
      ],
    },
    {
      key: 'location',
      label: 'Location',
      options: [
        { label: 'All Locations', value: 'all' },
        ...locations.map(l => ({ label: l, value: l.toLowerCase().replace(' ', '-') })),
      ],
    },
    {
      key: 'gender',
      label: 'Gender',
      options: [
        { label: 'All', value: 'all' },
        { label: 'Male', value: 'male' },
        { label: 'Female', value: 'female' },
        { label: 'Other', value: 'other' },
      ],
    },
    {
      key: 'status',
      label: 'Status',
      options: [
        { label: 'All Status', value: 'all' },
        { label: 'Active', value: 'active' },
        { label: 'Inactive', value: 'inactive' },
        { label: 'On Leave', value: 'on-leave' },
      ],
    },
  ];

  const handleFilterChange = (key: string, value: string) => {
    setActiveFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleClearFilters = () => {
    setActiveFilters({
      month: 'all',
      department: 'all',
      location: 'all',
      gender: 'all',
      status: 'all',
    });
  };

  // Chart data transformations
  const departmentChartData = departmentBreakdown.map(d => ({
    label: d.name.substring(0, 3),
    value: d.count,
    color: d.name === 'Engineering' ? '#10b981' : 
           d.name === 'Sales' ? '#6366f1' :
           d.name === 'Marketing' ? '#f59e0b' :
           d.name === 'HR' ? '#ec4899' :
           d.name === 'Finance' ? '#8b5cf6' :
           d.name === 'Operations' ? '#06b6d4' :
           d.name === 'IT' ? '#f97316' : '#84cc16',
  }));

  const hiringTrendData = hiringTrends.map(d => ({
    label: d.month,
    values: [
      { key: 'hires', value: d.hires, color: '#10b981' },
      { key: 'exits', value: d.exits, color: '#ef4444' },
    ],
  }));

  const attritionChartData = attritionData.map(d => ({
    label: d.department,
    values: [
      { key: 'voluntary', value: d.voluntary, color: '#6366f1' },
      { key: 'involuntary', value: d.involuntary, color: '#f59e0b' },
    ],
  }));

  const attendanceTrendData = attendanceData.map(d => ({
    label: d.month,
    values: [
      { key: 'present', value: d.present, color: '#10b981' },
    ],
  }));

  const ageGroupData = demographicsData.ageGroups.map(d => ({
    label: d.range,
    value: d.count,
    color: d.range === '26-35' ? '#10b981' : '#6366f1',
  }));

  const performanceChartData = performanceData.map(d => ({
    label: d.rating,
    value: d.count,
    color: d.rating === 'Exceeds' ? '#10b981' : 
           d.rating === 'Meets' ? '#6366f1' :
           d.rating === 'Needs Improvement' ? '#f59e0b' : '#ef4444',
  }));

  const locationChartData = locationData.map(d => ({
    label: d.city.split(' ')[0],
    value: d.employees,
    color: d.growth > 10 ? '#10b981' : d.growth > 0 ? '#6366f1' : '#ef4444',
  }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-emerald-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-[1600px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl shadow-lg shadow-emerald-500/20">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">HR Analytics Dashboard</h1>
                <p className="text-xs text-gray-500">Real-time workforce insights</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Search */}
              <div className="relative hidden md:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search employees, departments..."
                  className="pl-10 pr-4 py-2 w-64 bg-gray-100 border border-transparent rounded-xl text-sm focus:outline-none focus:border-emerald-300 focus:bg-white transition-all"
                />
              </div>
              
              {/* Actions */}
              <button className="p-2 hover:bg-gray-100 rounded-xl transition-colors relative">
                <Bell className="w-5 h-5 text-gray-600" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
              <button className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                <Settings className="w-5 h-5 text-gray-600" />
              </button>
              
              {/* Export Button */}
              <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl text-sm font-medium hover:from-emerald-600 hover:to-emerald-700 transition-all shadow-lg shadow-emerald-500/20">
                <Download className="w-4 h-4" />
                Export Report
              </button>
              
              {/* Profile */}
              <div className="flex items-center gap-2 pl-3 border-l border-gray-200">
                <div className="w-9 h-9 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-xl flex items-center justify-center text-white font-bold text-sm">
                  JD
                </div>
                <div className="hidden lg:block">
                  <p className="text-sm font-medium text-gray-900">John Doe</p>
                  <p className="text-xs text-gray-500">HR Admin</p>
                </div>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-6 py-6 space-y-6">
        {/* Filter Bar */}
        <FilterBar
          filters={filters}
          activeFilters={activeFilters}
          onFilterChange={handleFilterChange}
          onClearFilters={handleClearFilters}
        />

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
          <KPICard
            title="Total Employees"
            value={kpiData.totalEmployees}
            change={5.2}
            changeLabel="vs last year"
            icon={<Users className="w-5 h-5" />}
            index={0}
          />
          <KPICard
            title="Active Employees"
            value={kpiData.activeEmployees}
            change={3.8}
            changeLabel="vs last month"
            icon={<UserCheck className="w-5 h-5" />}
            index={1}
          />
          <KPICard
            title="New Hires"
            value={kpiData.newHires}
            change={12}
            changeLabel="this quarter"
            icon={<UserPlus className="w-5 h-5" />}
            index={2}
          />
          <KPICard
            title="Attrition Rate"
            value={kpiData.attritionRate}
            change={-1.5}
            changeLabel="vs last year"
            suffix="%"
            icon={<TrendingDown className="w-5 h-5" />}
            index={3}
          />
          <KPICard
            title="Avg. Salary"
            value={kpiData.avgSalary}
            prefix="$"
            change={4.5}
            changeLabel="increase"
            icon={<DollarSign className="w-5 h-5" />}
            index={4}
          />
          <KPICard
            title="Attendance"
            value={kpiData.attendanceRate}
            suffix="%"
            change={0.8}
            changeLabel="this month"
            icon={<Calendar className="w-5 h-5" />}
            index={5}
          />
          <KPICard
            title="Leave Balance"
            value={kpiData.leaveBalance}
            change={-2}
            changeLabel="days used"
            icon={<Clock className="w-5 h-5" />}
            index={6}
          />
          <KPICard
            title="Departments"
            value={kpiData.departmentCount}
            icon={<Building2 className="w-5 h-5" />}
            index={7}
          />
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Hiring Trends */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Hiring Trends</h3>
                <p className="text-sm text-gray-500">Monthly hires vs exits</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span className="text-xs text-gray-600">Hires</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <span className="text-xs text-gray-600">Exits</span>
                </div>
              </div>
            </div>
            <LineChart data={hiringTrendData} height={220} />
          </motion.div>

          {/* Department Distribution */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Department Distribution</h3>
                <p className="text-sm text-gray-500">Employees by department</p>
              </div>
            </div>
            <BarChart data={departmentChartData} height={220} />
          </motion.div>

          {/* Gender Demographics */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Gender Distribution</h3>
                <p className="text-sm text-gray-500">Workforce demographics</p>
              </div>
            </div>
            <DonutChart
              data={demographicsData.gender}
              size={180}
              thickness={40}
              centerText="Total"
              centerValue={kpiData.totalEmployees}
            />
          </motion.div>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Attrition Analysis */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Attrition Analysis</h3>
                <p className="text-sm text-gray-500">Voluntary vs Involuntary by department</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-indigo-500" />
                  <span className="text-xs text-gray-600">Voluntary</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-amber-500" />
                  <span className="text-xs text-gray-600">Involuntary</span>
                </div>
              </div>
            </div>
            <StackedBarChart data={attritionChartData} />
          </motion.div>

          {/* Attendance Trends */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Attendance Trends</h3>
                <p className="text-sm text-gray-500">Monthly attendance rate</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-emerald-600">94.5%</p>
                <p className="text-xs text-gray-500">Current Rate</p>
              </div>
            </div>
            <LineChart data={attendanceTrendData} height={200} />
          </motion.div>
        </div>

        {/* Charts Row 3 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Performance Distribution */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Performance Ratings</h3>
                <p className="text-sm text-gray-500">Employee performance breakdown</p>
              </div>
              <Award className="w-5 h-5 text-emerald-500" />
            </div>
            <BarChart data={performanceChartData} height={180} />
          </motion.div>

          {/* Location Distribution */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Office Locations</h3>
                <p className="text-sm text-gray-500">Employees by location</p>
              </div>
              <MapPin className="w-5 h-5 text-indigo-500" />
            </div>
            <BarChart data={locationChartData} height={180} />
          </motion.div>

          {/* Age Demographics */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Age Distribution</h3>
                <p className="text-sm text-gray-500">Workforce age groups</p>
              </div>
              <Activity className="w-5 h-5 text-amber-500" />
            </div>
            <BarChart data={ageGroupData} height={180} />
          </motion.div>
        </div>

        {/* Bottom Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Department Details */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Department Overview</h3>
                <p className="text-sm text-gray-500">Detailed breakdown by department</p>
              </div>
              <Briefcase className="w-5 h-5 text-gray-400" />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Department</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Employees</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Avg. Salary</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Growth</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Capacity</th>
                  </tr>
                </thead>
                <tbody>
                  {departmentBreakdown.map((dept, index) => (
                    <motion.tr
                      key={dept.name}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 + index * 0.05 }}
                      className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                    >
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-100 to-emerald-200 flex items-center justify-center">
                            <span className="text-xs font-bold text-emerald-700">{dept.name.substring(0, 2)}</span>
                          </div>
                          <span className="font-medium text-gray-900">{dept.name}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-right font-semibold text-gray-900">{dept.count}</td>
                      <td className="py-4 px-4 text-right text-gray-600">${dept.avgSalary.toLocaleString()}</td>
                      <td className="py-4 px-4 text-right">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                          dept.growth > 0 ? 'bg-emerald-100 text-emerald-700' : 
                          dept.growth < 0 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {dept.growth > 0 ? '+' : ''}{dept.growth}%
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full"
                            style={{ width: `${(dept.count / 350) * 100}%` }}
                          />
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>

          {/* Recent Activity */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55 }}
            className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
                <p className="text-sm text-gray-500">Latest HR events</p>
              </div>
              <AlertCircle className="w-5 h-5 text-gray-400" />
            </div>
            <div className="space-y-4">
              {recentActivities.map((activity, index) => (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.55 + index * 0.05 }}
                  className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    activity.type === 'hire' ? 'bg-emerald-100 text-emerald-600' :
                    activity.type === 'exit' ? 'bg-red-100 text-red-600' :
                    activity.type === 'promotion' ? 'bg-indigo-100 text-indigo-600' :
                    'bg-amber-100 text-amber-600'
                  }`}>
                    {activity.type === 'hire' && <UserPlus className="w-5 h-5" />}
                    {activity.type === 'exit' && <TrendingDown className="w-5 h-5" />}
                    {activity.type === 'promotion' && <Award className="w-5 h-5" />}
                    {activity.type === 'leave' && <Calendar className="w-5 h-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{activity.name}</p>
                    <p className="text-xs text-gray-500">{activity.department} • {activity.date}</p>
                  </div>
                  <span className={`text-xs font-medium capitalize px-2 py-1 rounded-full ${
                    activity.type === 'hire' ? 'bg-emerald-50 text-emerald-700' :
                    activity.type === 'exit' ? 'bg-red-50 text-red-700' :
                    activity.type === 'promotion' ? 'bg-indigo-50 text-indigo-700' :
                    'bg-amber-50 text-amber-700'
                  }`}>
                    {activity.type}
                  </span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Leave Balance Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Leave Management</h3>
              <p className="text-sm text-gray-500">Organization-wide leave balance</p>
            </div>
            <Clock className="w-5 h-5 text-gray-400" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {leaveData.map((leave, index) => (
              <motion.div
                key={leave.type}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.6 + index * 0.05 }}
                className="p-4 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200"
              >
                <p className="text-sm font-medium text-gray-600 mb-2">{leave.type}</p>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{leave.remaining}</p>
                    <p className="text-xs text-gray-500">remaining</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-red-500">{leave.used}</p>
                    <p className="text-xs text-gray-500">used</p>
                  </div>
                </div>
                <div className="mt-3 w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full"
                    style={{ width: `${(leave.remaining / (leave.used + leave.remaining)) * 100}%` }}
                  />
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-8">
        <div className="max-w-[1600px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <p>© 2024 HR Analytics Dashboard. All rights reserved.</p>
            <p>Last updated: {new Date().toLocaleString()}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
