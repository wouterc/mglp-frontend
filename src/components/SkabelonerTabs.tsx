import React from 'react';
import { NavLink } from 'react-router-dom';
import { SquareStack, CheckSquare, FileStack, ListChecks } from 'lucide-react';

const SkabelonerTabs: React.FC = () => {
    const tabs = [
        {
            path: '/skabeloner/blokinfo',
            label: 'BlokInfo Skabeloner',
            icon: SquareStack
        },
        {
            path: '/skabeloner/aktiviteter',
            label: 'Aktivitetsskabeloner',
            icon: CheckSquare
        },
        {
            path: '/skabeloner/dokumenter',
            label: 'Dokumentskabeloner',
            icon: FileStack
        },
        {
            path: '/skabeloner/vareliste',
            label: 'Vareliste',
            icon: ListChecks
        },
    ];

    return (
        <div>
            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                {tabs.map((tab) => (
                    <NavLink
                        key={tab.path}
                        to={tab.path}
                        className={({ isActive }) =>
                            `
              group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm
              ${isActive
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }
              `
                        }
                    >
                        <tab.icon
                            className={`
                -ml-0.5 mr-2 h-5 w-5
                ${window.location.pathname.startsWith(tab.path) ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'}
              `}
                            aria-hidden="true"
                        />
                        <span>{tab.label}</span>
                    </NavLink>
                ))}
            </nav>
        </div>
    );
};

export default SkabelonerTabs;
