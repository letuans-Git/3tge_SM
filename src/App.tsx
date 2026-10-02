import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider, useData } from './context/DataContext';
import { Navbar, NavTab } from './components/Navbar';
import { Dashboard } from './components/Dashboard';
import { CustomersView } from './components/CustomersView';
import { MaintenanceView } from './components/MaintenanceView';
import { InventoryView } from './components/InventoryView';
import { CashFlowView } from './components/CashFlowView';
import { ReportsView } from './components/ReportsView';
import { LoginView } from './components/LoginView';
import { PhoneCall, ShieldCheck, Sun } from 'lucide-react';
import { SolarLogo } from './components/SolarLogo';

function MainApp() {
  const { currentUser, loadingAuth } = useAuth();
  const { isOnline } = useData();
  const [currentTab, setCurrentTab] = useState<NavTab>('customers');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const prevUserIdRef = React.useRef<string | null>(null);

  // When user signs in or switches accounts, default directly to customer management
  React.useEffect(() => {
    if (currentUser?.id && currentUser.id !== prevUserIdRef.current) {
      setCurrentTab('customers');
      prevUserIdRef.current = currentUser.id;
    } else if (!currentUser) {
      prevUserIdRef.current = null;
    }
  }, [currentUser?.id]);

  if (loadingAuth) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white space-y-3">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-slate-400 font-semibold tracking-wider uppercase">
          Đang đồng bộ dữ liệu người dùng...
        </p>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginView />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-800 font-sans selection:bg-emerald-100 selection:text-emerald-900">
      <Navbar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
        isOnline={isOnline}
      />

      <main className="flex-1 max-w-[96rem] w-full mx-auto px-2 sm:px-3 lg:px-4 py-2 sm:py-2.5 pb-8">
        {currentTab === 'dashboard' && (
          <Dashboard onNavigateToTab={(tab) => setCurrentTab(tab as NavTab)} />
        )}
        {currentTab === 'customers' && <CustomersView />}
        {currentTab === 'maintenance' && <MaintenanceView />}
        {currentTab === 'inventory' && <InventoryView />}
        {currentTab === 'cashflow' && <CashFlowView />}
        {currentTab === 'reports' && <ReportsView />}
      </main>

      {/* Compact Clean Footer */}
      <footer className="bg-white border-t border-slate-200 py-3 px-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 font-bold text-slate-700">
            <SolarLogo className="w-4 h-4 rounded-sm border-none shadow-none" />
            <span>3TGE SOLAR SYSTEM</span>
            <span className="text-[10px] text-slate-400 font-normal">| NĂNG LƯỢNG XANH - KIẾN TẠO TƯƠNG LAI</span>
          </div>

          <div className="flex items-center gap-4 text-[11px] text-slate-500">
            <span className="flex items-center gap-1 text-emerald-700 font-semibold">
              <PhoneCall className="w-3.5 h-3.5" /> Hotline: 0913.566.532
            </span>
            <span className="hidden sm:inline">•</span>
            <span>Đồng bộ Real-time</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <MainApp />
      </DataProvider>
    </AuthProvider>
  );
}
