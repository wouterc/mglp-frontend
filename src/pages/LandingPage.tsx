import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, ArrowRight } from 'lucide-react';
import Button from '../components/ui/Button';

const LandingPage: React.FC = () => {
    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col items-center justify-center p-4">
            <div className="max-w-md w-full text-center space-y-8">
                <div className="flex justify-center">
                    <div className="bg-white p-4 rounded-2xl shadow-xl">
                        <ShieldCheck className="w-16 h-16 text-blue-600" />
                    </div>
                </div>

                <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">
                    MGLP
                </h1>

                <p className="text-lg text-gray-600">
                    Sagsstyring, Aktiviteter og Register.
                    <br />
                    Log ind for at få adgang til platformen.
                </p>

                <div className="flex flex-col space-y-4">
                    <Link to="/login" className="w-full">
                        <Button variant="primary" className="w-full justify-center py-3 text-lg h-12">
                            Log ind
                            <ArrowRight className="ml-2 w-5 h-5" />
                        </Button>
                    </Link>

                    {/* 
                    <div className="text-sm text-gray-500 pt-4">
                        Kontakt administrator hvis du mangler adgang.
                    </div> 
                    */}
                </div>
            </div>

            <div className="absolute bottom-4 text-xs text-gray-400">
                © {new Date().getFullYear()} MGLP System
            </div>
        </div>
    );
};

export default LandingPage;
