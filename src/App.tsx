import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Users, UserCheck, UserPlus, TrendingUp, TrendingDown, DollarSign,
  Calendar, Clock, Building2, Download, Bell,
  Search, ChevronDown, ChevronRight, BarChart3, PieChart, Activity,
  MapPin, Briefcase, Award, AlertCircle, Menu, Sparkles
} from 'lucide-react';
import { KPICard } from './components/KPICard';
import type { Tone } from './components/KPICard';
import { BarChart } from './components/BarChart';
import { DonutChart } from './components/DonutChart';
import { LineChart } from './components/LineChart';
import { StackedBarChart } from './components/StackedBarChart';
import { FilterBar } from './components/FilterBar';
import { Sidebar } from './components/Sidebar';
import { ThemeMenu } from './components/ThemeMenu';
import {
  kpiData, departmentBreakdown, hiringTrends, attritionData,
  demographicsData, attendanceData, performanceData, locationData,
  leaveData, recentActivities, departments, locations
} from './data/hrData';

/* Colour + tone maps keep the department palette in one place instead of
   repeating a ternary chain per chart. */
const DEPT_COLORS: Record<string, string> = {
  Engineering: '#10b981', Sales: '#6366f1', Marketing: '#f59e0b', HR: '#ec4899',
  Finance: '#8b5cf6', Operations: '#06b6d4', IT: '#0ea5e9', Legal: '#64748b',
};
const DEPT_TONES: Record<string, Tone> = {
  Engineering: 'emerald', Sales: 'indigo', Marketing: 'amber', HR: 'rose',
  Finance: 'violet', Operations: 'cyan', IT: 'sky', Legal: 'slate',
};
const deptColor = (name: string) => DEPT_COLORS[name] ?? '#10b981';
const deptTone = (name: string): Tone => DEPT_TONES[name] ?? 'slate';

/* Two-series line-chart colours. Blue + orange rather than green + red: the
   green/red pairing collapses to near-identical browns under deuteranopia
   (measured dE 19, vs 118 for this pair) and fails WCAG 1.4.1 'use of colour'.
   Measured by scripts/verify-theme.py — re-run it before changing these. */
const SERIES = { hires: '#0ea5e9', exits: '#f97316' };

const ACTIVITY_TONES: Record<string, Tone> = {
  hire: 'emerald', exit: 'rose', promotion: 'indigo', leave: 'amber',
};

const LEAVE_TONES: Tone[] = ['emerald', 'rose', 'indigo', 'violet'];

export default function App() {
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({
    month: 'all',
    department: 'all',
    location: 'all',
    gender: 'all',
    status: 'all',
  });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

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
    color: deptColor(d.name),
  }));

  const hiringTrendData = hiringTrends.map(d => ({
    label: d.month,
    values: [
      { key: 'hires', value: d.hires, color: SERIES.hires },
      { key: 'exits', value: d.exits, color: SERIES.exits },
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
      { key: 'present', value: d.present, color: '#06b6d4' },
    ],
  }));

  const ageGroupData = demographicsData.ageGroups.map(d => ({
    label: d.range,
    value: d.count,
    color: d.range === '26-35' ? '#10b981' : '#6366f1',
  }));

  const performanceChartData = performanceData.map(d => ({
    label: d.rating === 'Needs Improvement' ? 'Needs' : d.rating,
    value: d.count,
    color: d.rating === 'Exceeds' ? '#10b981' :
           d.rating === 'Meets' ? '#6366f1' :
           d.rating === 'Needs Improvement' ? '#f59e0b' : '#f43f5e',
  }));

  const locationChartData = locationData.map(d => ({
    label: d.city.split(' ')[0],
    value: d.employees,
    color: d.growth > 10 ? '#10b981' : d.growth > 0 ? '#6366f1' : '#f43f5e',
  }));

  const largestDept = departmentBreakdown.reduce((a, b) => (b.count > a.count ? b : a));

  return (
    <div className={`app-canvas min-h-screen transition-[padding] duration-300 ${
      sidebarCollapsed ? 'lg:ps-24' : 'lg:ps-[264px]'
    }`}>
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggleCollapsed={() => setSidebarCollapsed(prev => !prev)}
        mobileOpen={mobileNavOpen}
        onCloseMobile={() => setMobileNavOpen(false)}
      />

      {/* Mobile scrim */}
      {mobileNavOpen && (
        <div
          onClick={() => setMobileNavOpen(false)}
          aria-hidden
          className="fixed inset-0 z-[60] bg-gray-900/40 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* Header */}
      <header className="glass-bar header-elevation sticky top-0 z-40 border-b border-hair-strong/70">
        <div className="max-w-[1600px] mx-auto px-6 py-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileNavOpen(true)}
                aria-label="Open navigation"
                className="p-2 -ms-1 hover:bg-sunken rounded-xl transition-colors lg:hidden"
              >
                <Menu className="w-5 h-5 text-body" />
              </button>
              <div className="p-2 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl shadow-lg shadow-emerald-500/25 lg:hidden">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-[-0.01em] text-strong">HR Analytics Dashboard</h1>
                <p className="text-xs text-muted">Real-time workforce insights</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              {/* Search */}
              <div className="relative hidden md:block group">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-subtle transition-colors group-focus-within:text-emerald-500" />
                <input
                  type="text"
                  placeholder="Search employees, departments..."
                  className="ps-10 pe-4 py-2 w-64 bg-surface/80 border border-hair-strong rounded-xl text-sm shadow-soft placeholder:text-subtle transition-all focus:outline-none focus:border-emerald-300 focus:bg-surface focus:ring-4 focus:ring-emerald-500/10"
                />
              </div>

              {/* Actions */}
              <button className="relative p-2 rounded-xl text-body bg-surface/80 border border-hair-strong shadow-soft hover:bg-surface hover:text-strong transition-colors">
                <Bell className="w-4.5 h-4.5" />
                <span className="absolute top-1.5 end-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-surface" />
              </button>
              <ThemeMenu />

              <span className="hidden h-8 w-px bg-sunken-strong sm:block" />

              {/* Export Button */}
              <button className="hidden sm:flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl text-sm font-medium shadow-lg shadow-emerald-500/20 ring-1 ring-emerald-600/20 hover:from-emerald-600 hover:to-emerald-700 hover:shadow-emerald-500/30 transition-all">
                <Download className="w-4 h-4" />
                Export Report
              </button>

              {/* Profile */}
              <button className="flex items-center gap-2 rounded-xl ps-1.5 pe-2 py-1.5 ms-1 border border-hair-strong bg-surface/80 shadow-soft hover:bg-surface transition-colors">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 text-white font-bold text-xs ring-1 ring-emerald-600/20">
                  JD
                </span>
                <span className="hidden lg:block text-start">
                  <span className="block text-xs font-semibold text-strong">John Doe</span>
                  <span className="block text-[11px] text-muted">HR Admin</span>
                </span>
                <ChevronDown className="w-4 h-4 text-subtle" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="section-stack max-w-[1600px] mx-auto px-6 py-6">
        {/* Page intro: breadcrumb, live status, reporting period */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-subtle">Workforce</span>
            <ChevronRight className="h-3 w-3 text-subtle" />
            <span className="font-semibold text-strong">Overview</span>
            <span className="ms-1 inline-flex items-center gap-1.5 rounded-full bg-surface/80 px-2 py-1 font-medium text-emerald-700 ring-1 ring-emerald-100 shadow-soft">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
              </span>
              Live
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-surface/80 px-2.5 py-1.5 font-medium text-body ring-1 ring-hair shadow-soft">
              <Calendar className="h-3.5 w-3.5 text-subtle" />
              Jan 1 – Dec 31, 2024
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-surface/80 px-2.5 py-1.5 font-medium text-body ring-1 ring-hair shadow-soft">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              FY 2024
            </span>
          </div>
        </div>

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
            tone="sky"
            index={0}
          />
          <KPICard
            title="Active Employees"
            value={kpiData.activeEmployees}
            change={3.8}
            changeLabel="vs last month"
            icon={<UserCheck className="w-5 h-5" />}
            tone="emerald"
            index={1}
          />
          <KPICard
            title="New Hires"
            value={kpiData.newHires}
            change={12}
            changeLabel="this quarter"
            icon={<UserPlus className="w-5 h-5" />}
            tone="indigo"
            index={2}
          />
          <KPICard
            title="Attrition Rate"
            value={kpiData.attritionRate}
            change={-1.5}
            changeLabel="vs last year"
            suffix="%"
            icon={<TrendingDown className="w-5 h-5" />}
            tone="rose"
            index={3}
          />
          <KPICard
            title="Avg. Salary"
            value={kpiData.avgSalary}
            prefix="$"
            change={4.5}
            changeLabel="increase"
            icon={<DollarSign className="w-5 h-5" />}
            tone="violet"
            index={4}
          />
          <KPICard
            title="Attendance"
            value={kpiData.attendanceRate}
            suffix="%"
            change={0.8}
            changeLabel="this month"
            icon={<Calendar className="w-5 h-5" />}
            tone="cyan"
            index={5}
          />
          <KPICard
            title="Leave Balance"
            value={kpiData.leaveBalance}
            change={-2}
            changeLabel="days used"
            icon={<Clock className="w-5 h-5" />}
            tone="amber"
            index={6}
          />
          <KPICard
            title="Departments"
            value={kpiData.departmentCount}
            icon={<Building2 className="w-5 h-5" />}
            tone="slate"
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
            className="surface pad-panel"
          >
            <CardHeader
              title="Hiring Trends"
              subtitle="Monthly hires vs exits"
              tone="emerald"
              icon={<TrendingUp className="w-4.5 h-4.5" />}
            >
              <Legend items={[{ label: 'Hires', color: SERIES.hires }, { label: 'Exits', color: SERIES.exits }]} />
            </CardHeader>
            <div className="chart-plate p-3">
              <LineChart data={hiringTrendData} height={214} />
            </div>
          </motion.div>

          {/* Department Distribution */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="surface pad-panel"
          >
            <CardHeader
              title="Department Distribution"
              subtitle="Employees by department"
              tone="sky"
              icon={<Building2 className="w-4.5 h-4.5" />}
            />
            <div className="chart-plate p-4">
              <BarChart data={departmentChartData} height={206} />
            </div>
          </motion.div>

          {/* Gender Demographics */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="surface pad-panel"
          >
            <CardHeader
              title="Gender Distribution"
              subtitle="Workforce demographics"
              tone="violet"
              icon={<PieChart className="w-4.5 h-4.5" />}
            />
            <DonutChart
              data={demographicsData.gender}
              size={168}
              thickness={30}
              centerText="Total employees"
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
            className="surface pad-panel"
          >
            <CardHeader
              title="Attrition Analysis"
              subtitle="Voluntary vs involuntary by department"
              tone="rose"
              icon={<TrendingDown className="w-4.5 h-4.5" />}
            >
              <Legend items={[{ label: 'Voluntary', color: '#6366f1' }, { label: 'Involuntary', color: '#f59e0b' }]} />
            </CardHeader>
            <div className="chart-plate p-4">
              <StackedBarChart data={attritionChartData} />
            </div>
          </motion.div>

          {/* Attendance Trends */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="surface pad-panel"
          >
            <CardHeader
              title="Attendance Trends"
              subtitle="Monthly attendance rate"
              tone="cyan"
              icon={<Calendar className="w-4.5 h-4.5" />}
            >
              <div className="rounded-xl bg-cyan-50 px-3 py-1.5 text-end ring-1 ring-cyan-100">
                <p className="tnum text-base font-bold leading-none text-cyan-700">94.5%</p>
                <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-cyan-600/80">Current</p>
              </div>
            </CardHeader>
            <div className="chart-plate p-3">
              <LineChart data={attendanceTrendData} height={196} />
            </div>
          </motion.div>
        </div>

        {/* Charts Row 3 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Performance Distribution */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="surface pad-panel"
          >
            <CardHeader
              title="Performance Ratings"
              subtitle="Employee performance breakdown"
              tone="amber"
              icon={<Award className="w-4.5 h-4.5" />}
            />
            <div className="chart-plate p-4">
              <BarChart data={performanceChartData} height={180} />
            </div>
          </motion.div>

          {/* Location Distribution */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="surface pad-panel"
          >
            <CardHeader
              title="Office Locations"
              subtitle="Employees by location"
              tone="indigo"
              icon={<MapPin className="w-4.5 h-4.5" />}
            />
            <div className="chart-plate p-4">
              <BarChart data={locationChartData} height={180} />
            </div>
          </motion.div>

          {/* Age Demographics */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="surface pad-panel"
          >
            <CardHeader
              title="Age Distribution"
              subtitle="Workforce age groups"
              tone="slate"
              icon={<Activity className="w-4.5 h-4.5" />}
            />
            <div className="chart-plate p-4">
              <BarChart data={ageGroupData} height={180} />
            </div>
          </motion.div>
        </div>

        {/* Bottom Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Department Details */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="surface lg:col-span-2 pad-panel"
          >
            <CardHeader
              title="Department Overview"
              subtitle="Headcount, salary and growth by department"
              tone="sky"
              icon={<Briefcase className="w-4.5 h-4.5" />}
            />

            {/* Headline figures */}
            <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <MiniStat label="Departments" value={departmentBreakdown.length} tone="sky" />
              <MiniStat label="Total headcount" value={kpiData.totalEmployees} tone="emerald" />
              <MiniStat label="Largest team" value={`${largestDept.name} · ${largestDept.count}`} tone="violet" />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="rounded-s-lg bg-sunken/80 px-4 py-2.5 text-start text-[11px] font-semibold uppercase tracking-wider text-muted">Department</th>
                    <th className="bg-sunken/80 px-4 py-2.5 text-end text-[11px] font-semibold uppercase tracking-wider text-muted">Employees</th>
                    <th className="bg-sunken/80 px-4 py-2.5 text-end text-[11px] font-semibold uppercase tracking-wider text-muted">Avg. Salary</th>
                    <th className="bg-sunken/80 px-4 py-2.5 text-end text-[11px] font-semibold uppercase tracking-wider text-muted">Growth</th>
                    <th className="rounded-e-lg bg-sunken/80 px-4 py-2.5 text-start text-[11px] font-semibold uppercase tracking-wider text-muted">Capacity</th>
                  </tr>
                </thead>
                <tbody>
                  {departmentBreakdown.map((dept, index) => (
                    <motion.tr
                      key={dept.name}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 + index * 0.05 }}
                      className={`group tone-${deptTone(dept.name)} row-hover border-b border-hair/80 transition-colors last:border-0`}
                    >
                      <td className="px-4 cell-y">
                        <div className="flex items-center gap-3">
                          <span className="tile grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[11px] font-bold">
                            {dept.name.substring(0, 2)}
                          </span>
                          <span className="text-sm font-semibold text-strong">{dept.name}</span>
                        </div>
                      </td>
                      <td className="tnum px-4 cell-y text-end text-sm font-bold text-strong">{dept.count}</td>
                      <td className="tnum px-4 cell-y text-end text-sm text-body">${dept.avgSalary.toLocaleString()}</td>
                      <td className="px-4 cell-y text-end">
                        <span className={`chip tnum ${
                          dept.growth > 0 ? 'chip-positive' : dept.growth < 0 ? 'chip-negative' : 'chip-neutral'
                        }`}>
                          {dept.growth > 0 ? <TrendingUp className="h-3 w-3" /> : dept.growth < 0 ? <TrendingDown className="h-3 w-3" /> : null}
                          {dept.growth > 0 ? '+' : ''}{dept.growth}%
                        </span>
                      </td>
                      <td className="px-4 cell-y">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-sunken ring-1 ring-inset ring-hair-strong/60">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${(dept.count / 350) * 100}%` }}
                              transition={{ duration: 0.8, delay: 0.55 + index * 0.05, ease: [0.22, 1, 0.36, 1] }}
                              className="h-full rounded-full"
                              style={{ backgroundImage: `linear-gradient(90deg, ${deptColor(dept.name)}aa, ${deptColor(dept.name)})` }}
                            />
                          </div>
                          <span className="tnum w-9 shrink-0 text-end text-[11px] font-medium text-subtle">
                            {Math.round((dept.count / largestDept.count) * 100)}%
                          </span>
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
            className="surface pad-panel"
          >
            <CardHeader
              title="Recent Activity"
              subtitle="Latest HR events"
              tone="indigo"
              icon={<AlertCircle className="w-4.5 h-4.5" />}
            />
            <div className="relative">
              {/* Timeline spine, aligned to the centre of the 40px icon tiles */}
              <span className="absolute start-5 top-3 bottom-3 w-px bg-gradient-to-b from-hair-strong via-hair-strong to-transparent" aria-hidden />
              <div className="space-y-1">
                {recentActivities.map((activity, index) => (
                  <motion.div
                    key={activity.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.55 + index * 0.05 }}
                    className={`group tone-${ACTIVITY_TONES[activity.type] ?? 'slate'} relative flex items-start gap-3 rounded-xl p-2.5 transition-colors hover:bg-sunken`}
                  >
                    <div className="tone-soft relative grid h-10 w-10 shrink-0 place-items-center rounded-xl ring-1 ring-inset ring-hair/30">
                      {activity.type === 'hire' && <UserPlus className="w-4.5 h-4.5" />}
                      {activity.type === 'exit' && <TrendingDown className="w-4.5 h-4.5" />}
                      {activity.type === 'promotion' && <Award className="w-4.5 h-4.5" />}
                      {activity.type === 'leave' && <Calendar className="w-4.5 h-4.5" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-strong">{activity.name}</p>
                      <p className="mt-0.5 truncate text-[11px] text-muted">
                        <span className="tone-text font-medium">{activity.department}</span> · {activity.date}
                      </p>
                    </div>
                    <span className="tone-soft shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ring-1 ring-inset ring-hair/30">
                      {activity.type}
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Leave Balance Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="surface pad-panel"
        >
          <CardHeader
            title="Leave Management"
            subtitle="Organization-wide leave balance"
            tone="emerald"
            icon={<Clock className="w-4.5 h-4.5" />}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {leaveData.map((leave, index) => {
              const totalDays = leave.used + leave.remaining;
              const usedShare = (leave.used / totalDays) * 100;
              const tone = LEAVE_TONES[index % LEAVE_TONES.length];
              return (
                <motion.div
                  key={leave.type}
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.6 + index * 0.05 }}
                  className={`tone-${tone} surface surface-lift relative overflow-hidden p-4`}
                >
                  <span className="tile absolute inset-y-0 start-0 w-1 rounded-e-full" aria-hidden />

                  <div className="flex items-center justify-between gap-2 ps-1.5">
                    <p className="truncate text-xs font-semibold text-body">{leave.type}</p>
                    <span className="tone-soft shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ring-inset ring-hair/30">
                      {usedShare.toFixed(0)}% used
                    </span>
                  </div>

                  <div className="mt-3 flex items-end justify-between gap-2 ps-1.5">
                    <div>
                      <p className="tnum text-2xl font-bold leading-none text-strong">{leave.remaining}</p>
                      <p className="mt-1 text-[11px] text-muted">days remaining</p>
                    </div>
                    <div className="text-end">
                      <p className="tnum text-sm font-semibold text-rose-500">{leave.used}</p>
                      <p className="text-[11px] text-muted">used</p>
                    </div>
                  </div>

                  <div className="mt-3 flex h-1.5 overflow-hidden rounded-full bg-sunken ring-1 ring-inset ring-hair-strong/60">
                    <motion.span
                      initial={{ width: 0 }}
                      animate={{ width: `${usedShare}%` }}
                      transition={{ duration: 0.8, delay: 0.65 + index * 0.05, ease: [0.22, 1, 0.36, 1] }}
                      className="h-full bg-gradient-to-r from-rose-400 to-rose-500"
                    />
                    <span className="h-full flex-1 bg-gradient-to-r from-emerald-400 to-emerald-500" />
                  </div>
                  <p className="tnum mt-2 ps-1.5 text-[10px] font-medium text-subtle">{totalDays.toLocaleString()} days entitlement</p>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="mt-8 border-t border-hair-strong/70 bg-surface/60 backdrop-blur-sm">
        <div className="max-w-[1600px] mx-auto px-6 py-4">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
            <p>© 2024 HR Analytics Dashboard · All rights reserved.</p>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                All systems operational
              </span>
              <span className="h-3 w-px bg-hair-strong" />
              <span>Last updated: {new Date().toLocaleString()}</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ---------------------------------------------------------------------------
   Small presentational helpers shared by the cards above. Kept local because
   they only shape this page's chrome, not the data components.
   --------------------------------------------------------------------------- */

function CardHeader({
  title,
  subtitle,
  icon,
  tone = 'emerald',
  children,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  tone?: Tone;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div className="flex items-start gap-3">
        {icon && (
          <span className={`tile tone-${tone} grid h-9 w-9 shrink-0 place-items-center rounded-xl`}>
            {icon}
          </span>
        )}
        <div>
          <h3 className="text-[15px] font-semibold tracking-[-0.01em] text-strong">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

function Legend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <div className="flex items-center gap-3">
      {items.map((item) => (
        <span key={item.label} className="inline-flex items-center gap-1.5">
          <span
            className="h-2.5 w-2.5 rounded-full ring-2 ring-surface"
            style={{ backgroundColor: item.color, boxShadow: `0 1px 4px -1px ${item.color}aa` }}
          />
          <span className="text-[11px] font-medium text-body">{item.label}</span>
        </span>
      ))}
    </div>
  );
}

function MiniStat({ label, value, tone }: { label: string; value: string | number; tone: Tone }) {
  return (
    <div className={`tone-${tone} flex items-center gap-3 rounded-xl border border-hair bg-gradient-to-br from-surface to-surface-2 px-3.5 py-2.5 shadow-soft`}>
      <span className="tile grid h-7 w-7 shrink-0 place-items-center rounded-lg">
        <span className="h-1.5 w-1.5 rounded-full bg-surface" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-[11px] font-medium uppercase tracking-wide text-muted">{label}</p>
        <p className="tnum truncate text-sm font-bold text-strong">{value}</p>
      </div>
    </div>
  );
}
