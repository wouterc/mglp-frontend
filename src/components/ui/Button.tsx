// --- Fil: src/components/ui/Button.tsx ---
// @# 2025-11-15 12:00 - Oprettet ny genbrugelig Button-komponent
import React, { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react'; // Importer Lucide-typen

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'danger';
  ikon?: LucideIcon;
  className?: string; // Tillad 'className' prop
}

function Button({ 
  children, 
  variant = 'secondary', 
  ikon: Ikon, 
  className = '', // Sæt default til tom streng
  ...props 
}: ButtonProps): React.ReactElement {
  
  // Definer styles ét sted
  const baseStyle = "px-4 py-2 rounded-md flex items-center justify-center space-x-2 disabled:bg-gray-400 disabled:cursor-not-allowed";
  
  const variantStyles = {
    primary: "bg-blue-600 text-white hover:bg-blue-700",
    secondary: "bg-gray-200 text-gray-800 hover:bg-gray-300",
    danger: "bg-red-600 text-white hover:bg-red-700",
  };

  // Kombiner styles. Ekstern 'className' kan overskrive standard-styles.
  return (
    <button 
      className={`${baseStyle} ${variantStyles[variant]} ${className}`} 
      {...props}
    >
      {Ikon && <Ikon size={18} className="flex-shrink-0" />}
      <span>{children}</span>
    </button>
  );
}

export default Button;