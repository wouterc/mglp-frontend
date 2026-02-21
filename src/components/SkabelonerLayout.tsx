import React from 'react';
import { Outlet } from 'react-router-dom';
import SkabelonerTabs from './SkabelonerTabs';

const SkabelonerLayout: React.FC = () => {
    return (
        <div className="flex flex-col h-full bg-gray-50">
            <div className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 pt-4">
                <SkabelonerTabs />
            </div>
            <div className="flex-1 overflow-auto">
                <Outlet />
            </div>
        </div>
    );
};

export default SkabelonerLayout;
