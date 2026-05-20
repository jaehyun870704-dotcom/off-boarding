import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import DashboardPage from './pages/DashboardPage';
import StrategyPage from './pages/StrategyPage';
import TasksPage from './pages/TasksPage';
import ReportPage from './pages/ReportPage';
import SettingsPage from './pages/SettingsPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<DashboardPage />} />
          <Route path="strategy" element={<StrategyPage />} />
          <Route path="tasks" element={<TasksPage />} />
          <Route path="report" element={<ReportPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
