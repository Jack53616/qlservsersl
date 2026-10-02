import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { X } from 'lucide-react';

export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen flex">
      <aside className="hidden md:block w-64 shrink-0 glass border-e border-ql-border h-screen sticky top-0">
        <Sidebar />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <aside className="absolute top-0 start-0 w-72 h-full bg-ql-panel animate-fade-up">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 end-4 p-1.5 rounded-lg hover:bg-white/10 text-ql-text-dim"
            >
              <X size={18} />
            </button>
            <Sidebar onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        <Topbar onMenu={() => setMobileOpen(true)} />
        <main className="flex-1 p-4 md:p-6 space-y-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
