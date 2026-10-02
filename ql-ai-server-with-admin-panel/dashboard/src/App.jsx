import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { LangProvider } from './context/LangContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Keys from './pages/Keys';
import UsersPage from './pages/Users';
import Admins from './pages/Admins';
import Activity from './pages/Activity';
import Settings from './pages/Settings';

export default function App() {
  return (
    <LangProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="keys" element={<Keys />} />
              <Route path="users" element={<UsersPage />} />
              <Route path="admins" element={<ProtectedRoute superAdminOnly><Admins /></ProtectedRoute>} />
              <Route path="activity" element={<Activity />} />
              <Route path="settings" element={<Settings />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </LangProvider>
  );
}
