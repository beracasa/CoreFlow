import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { useLanguage } from '../contexts/LanguageContext';

const dataAvailability = [
  { name: 'Mon', value: 92 },
  { name: 'Tue', value: 94 },
  { name: 'Wed', value: 88 },
  { name: 'Thu', value: 96 },
  { name: 'Fri', value: 95 },
  { name: 'Sat', value: 98 },
  { name: 'Sun', value: 98 },
];

const dataCost = [
  { name: 'Jan', actual: 4000, budget: 2400 },
  { name: 'Feb', actual: 3000, budget: 2400 },
  { name: 'Mar', actual: 2000, budget: 2400 },
  { name: 'Apr', actual: 2780, budget: 2400 },
  { name: 'May', actual: 1890, budget: 2400 },
];

const dataFaults = [
  { name: 'Mechanical', value: 400 },
  { name: 'Electrical', value: 300 },
  { name: 'Software', value: 100 },
  { name: 'Operator', value: 200 },
];

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

export const Analytics: React.FC = () => {
  const { t } = useLanguage();

  return (
    <div className="h-full bg-industrial-900 p-6 overflow-y-auto">
      <h2 className="text-2xl font-bold text-white mb-6">{t('analytics.title')}</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Availability Chart */}
        <div className="bg-industrial-800 p-6 rounded-lg border border-industrial-700 shadow-lg">
          <h3 className="text-sm font-bold text-industrial-500 uppercase mb-4">{t('analytics.availability')}</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dataAvailability}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="name" stroke="#64748b" />
                <YAxis stroke="#64748b" domain={[80, 100]} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }} 
                  itemStyle={{ color: '#fff' }}
                />
                <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#3b82f6' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Cost vs Budget */}
        <div className="bg-industrial-800 p-6 rounded-lg border border-industrial-700 shadow-lg">
          <h3 className="text-sm font-bold text-industrial-500 uppercase mb-4">{t('analytics.cost')}</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dataCost}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="name" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip 
                  cursor={{fill: '#334155'}}
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }} 
                />
                <Legend />
                <Bar dataKey="actual" fill="#ef4444" name={t('analytics.spend')} />
                <Bar dataKey="budget" fill="#10b981" name={t('analytics.budget')} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Fault Analysis */}
        <div className="bg-industrial-800 p-6 rounded-lg border border-industrial-700 shadow-lg col-span-1">
          <h3 className="text-sm font-bold text-industrial-500 uppercase mb-4">{t('analytics.faults')}</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={dataFaults}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                >
                  {dataFaults.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                   contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }} 
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Text Stats */}
        <div className="col-span-2 grid grid-cols-2 gap-4">
             <div className="bg-gradient-to-br from-indigo-900 to-industrial-800 p-6 rounded-lg border border-indigo-500/30 flex flex-col justify-center items-center">
                <span className="text-4xl font-mono font-bold text-white">96.5%</span>
                <span className="text-industrial-400 text-sm mt-2">{t('analytics.oee')}</span>
             </div>
             <div className="bg-gradient-to-br from-emerald-900 to-industrial-800 p-6 rounded-lg border border-emerald-500/30 flex flex-col justify-center items-center">
                <span className="text-4xl font-mono font-bold text-white">12</span>
                <span className="text-industrial-400 text-sm mt-2">{t('analytics.incident')}</span>
             </div>
             <div className="bg-industrial-800 p-6 rounded-lg border border-industrial-700 flex flex-col justify-center">
                <span className="text-white font-bold mb-2">{t('analytics.pending')}</span>
                <div className="w-full bg-industrial-900 rounded-full h-2.5">
                  <div className="bg-yellow-500 h-2.5 rounded-full" style={{ width: '45%' }}></div>
                </div>
                <span className="text-right text-xs text-yellow-500 mt-1">45% {t('analytics.completion')}</span>
             </div>
             <div className="bg-industrial-800 p-6 rounded-lg border border-industrial-700 flex flex-col justify-center">
                <span className="text-white font-bold mb-2">{t('analytics.invHealth')}</span>
                <div className="w-full bg-industrial-900 rounded-full h-2.5">
                  <div className="bg-blue-500 h-2.5 rounded-full" style={{ width: '88%' }}></div>
                </div>
                <span className="text-right text-xs text-blue-500 mt-1">88% {t('analytics.optimal')}</span>
             </div>
        </div>
      </div>
    </div>
  );
};