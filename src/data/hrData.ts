// HR Analytics Dashboard Data
export interface Employee {
  id: string;
  name: string;
  department: string;
  location: string;
  gender: 'Male' | 'Female' | 'Other';
  status: 'Active' | 'Inactive' | 'On Leave';
  joinDate: string;
  salary: number;
  performance: number;
  attendance: number;
  leaveBalance: number;
}

export const departments = ['Engineering', 'Sales', 'Marketing', 'HR', 'Finance', 'Operations', 'IT', 'Legal'];
export const locations = ['New York', 'San Francisco', 'Chicago', 'Austin', 'Seattle', 'Boston'];
export const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const kpiData = {
  totalEmployees: 1247,
  activeEmployees: 1156,
  newHires: 89,
  attritionRate: 8.2,
  avgSalary: 78500,
  attendanceRate: 94.5,
  leaveBalance: 2456,
  departmentCount: 8,
};

export const departmentBreakdown = [
  { name: 'Engineering', count: 342, budget: 2850000, avgSalary: 83200, growth: 12 },
  { name: 'Sales', count: 256, budget: 1980000, avgSalary: 77300, growth: 8 },
  { name: 'Marketing', count: 187, budget: 1420000, avgSalary: 76000, growth: 15 },
  { name: 'HR', count: 98, budget: 780000, avgSalary: 79500, growth: 5 },
  { name: 'Finance', count: 134, budget: 1150000, avgSalary: 85800, growth: 3 },
  { name: 'Operations', count: 145, budget: 980000, avgSalary: 67500, growth: -2 },
  { name: 'IT', count: 65, budget: 620000, avgSalary: 95400, growth: 18 },
  { name: 'Legal', count: 20, budget: 220000, avgSalary: 110000, growth: 0 },
];

export const hiringTrends = [
  { month: 'Jan', hires: 12, exits: 5 },
  { month: 'Feb', hires: 8, exits: 7 },
  { month: 'Mar', hires: 15, exits: 4 },
  { month: 'Apr', hires: 22, exits: 9 },
  { month: 'May', hires: 18, exits: 6 },
  { month: 'Jun', hires: 25, exits: 8 },
  { month: 'Jul', hires: 14, exits: 5 },
  { month: 'Aug', hires: 19, exits: 11 },
  { month: 'Sep', hires: 28, exits: 7 },
  { month: 'Oct', hires: 16, exits: 9 },
  { month: 'Nov', hires: 11, exits: 4 },
  { month: 'Dec', hires: 7, exits: 3 },
];

export const attritionData = [
  { department: 'Engineering', voluntary: 12, involuntary: 3 },
  { department: 'Sales', voluntary: 18, involuntary: 5 },
  { department: 'Marketing', voluntary: 8, involuntary: 2 },
  { department: 'HR', voluntary: 3, involuntary: 1 },
  { department: 'Finance', voluntary: 5, involuntary: 2 },
  { department: 'Operations', voluntary: 14, involuntary: 4 },
  { department: 'IT', voluntary: 4, involuntary: 1 },
  { department: 'Legal', voluntary: 1, involuntary: 0 },
];

export const demographicsData = {
  gender: [
    { name: 'Male', value: 687, color: '#10b981' },
    { name: 'Female', value: 548, color: '#6366f1' },
    { name: 'Other', value: 12, color: '#f59e0b' },
  ],
  ageGroups: [
    { range: '18-25', count: 156 },
    { range: '26-35', count: 489 },
    { range: '36-45', count: 356 },
    { range: '46-55', count: 178 },
    { range: '55+', count: 68 },
  ],
  tenure: [
    { range: '< 1 year', count: 189 },
    { range: '1-3 years', count: 378 },
    { range: '3-5 years', count: 298 },
    { range: '5-10 years', count: 267 },
    { range: '10+ years', count: 115 },
  ],
};

export const attendanceData = [
  { month: 'Jan', present: 94.2, absent: 5.8 },
  { month: 'Feb', present: 93.8, absent: 6.2 },
  { month: 'Mar', present: 95.1, absent: 4.9 },
  { month: 'Apr', present: 94.5, absent: 5.5 },
  { month: 'May', present: 93.2, absent: 6.8 },
  { month: 'Jun', present: 96.1, absent: 3.9 },
  { month: 'Jul', present: 94.8, absent: 5.2 },
  { month: 'Aug', present: 95.5, absent: 4.5 },
  { month: 'Sep', present: 94.9, absent: 5.1 },
  { month: 'Oct', present: 95.2, absent: 4.8 },
  { month: 'Nov', present: 94.6, absent: 5.4 },
  { month: 'Dec', present: 93.9, absent: 6.1 },
];

export const performanceData = [
  { rating: 'Exceeds', count: 187, percentage: 15 },
  { rating: 'Meets', count: 756, percentage: 60.6 },
  { rating: 'Needs Improvement', count: 234, percentage: 18.8 },
  { rating: 'Below', count: 70, percentage: 5.6 },
];

export const locationData = [
  { city: 'New York', employees: 342, growth: 8 },
  { city: 'San Francisco', employees: 287, growth: 12 },
  { city: 'Chicago', employees: 198, growth: 3 },
  { city: 'Austin', employees: 156, growth: 18 },
  { city: 'Seattle', employees: 145, growth: 6 },
  { city: 'Boston', employees: 119, growth: -2 },
];

export const salaryDistribution = [
  { range: '<$50k', count: 89 },
  { range: '$50k-$75k', count: 345 },
  { range: '$75k-$100k', count: 478 },
  { range: '$100k-$125k', count: 234 },
  { range: '$125k-$150k', count: 78 },
  { range: '>$150k', count: 23 },
];

export const leaveData = [
  { type: 'Annual Leave', used: 4567, remaining: 8923 },
  { type: 'Sick Leave', used: 1234, remaining: 2890 },
  { type: 'Personal Leave', used: 567, remaining: 1433 },
  { type: 'Maternity/Paternity', used: 234, remaining: 876 },
];

export const recentActivities = [
  { id: 1, type: 'hire', name: 'Sarah Johnson', department: 'Engineering', date: '2024-01-15' },
  { id: 2, type: 'exit', name: 'Michael Chen', department: 'Sales', date: '2024-01-14' },
  { id: 3, type: 'promotion', name: 'Emily Davis', department: 'Marketing', date: '2024-01-13' },
  { id: 4, type: 'hire', name: 'James Wilson', department: 'IT', date: '2024-01-12' },
  { id: 5, type: 'leave', name: 'Anna Martinez', department: 'HR', date: '2024-01-11' },
];
