import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { useState } from 'react';

const Layout = () => {
  const [pageTitle, setPageTitle] = useState('Dashboard');

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 ml-64 flex flex-col">
        {/* Header */}
        <Header title={pageTitle} />

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-8">
          <Outlet context={{ setPageTitle }} />
        </main>
      </div>
    </div>
  );
};

export default Layout;