import React, { useState } from 'react';
import { Button } from '../components/UI';
import { SpinnerIcon, ArrowRightIcon } from '../components/Icons';

interface LoginPageProps {
    onLogin: (rut: string) => Promise<boolean>;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
    const [rut, setRut] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!rut) {
            setError('Por favor, ingrese un RUT.');
            return;
        }
        setIsLoading(true);
        setError('');
        const success = await onLogin(rut);
        if (!success) {
            setError('RUT no encontrado o inválido. Por favor, intente de nuevo.');
            setIsLoading(false);
        }
        // On success, App component will change view, so no need to setIsLoading(false)
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4 font-sans">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <svg className="h-16 w-16 text-brand-blue mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.627 48.627 0 0 1 12 20.904a48.627 48.627 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.57 50.57 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0 1 12 13.489a50.697 50.697 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5" />
                    </svg>
                    <h1 className="font-montserrat font-black text-4xl tracking-tighter mt-4">
                        <span className="text-brand-aqua">APRENDO</span><span className="text-brand-orange">CREANDO</span>
                    </h1>
                    <p className="mt-4 text-lg text-gray-600">
                        Bienvenido. Ingrese su RUT para acceder al portal.
                    </p>
                </div>

                <div className="bg-white p-8 rounded-2xl shadow-lg">
                    <form onSubmit={handleLogin}>
                        <div>
                            <label htmlFor="rut" className="block text-sm font-medium text-gray-700">
                                RUT
                            </label>
                            <div className="mt-1">
                                <input
                                    type="text"
                                    name="rut"
                                    id="rut"
                                    value={rut}
                                    onChange={(e) => setRut(e.target.value)}
                                    className="block w-full rounded-md border-gray-300 bg-white shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-lg"
                                    placeholder="Ingrese su RUT"
                                    aria-describedby="rut-error"
                                />
                            </div>
                            {error && <p className="mt-2 text-sm text-red-600" id="rut-error">{error}</p>}
                        </div>

                        <div className="mt-6">
                            <Button
                                type="submit"
                                className="w-full !py-3 !text-base"
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <SpinnerIcon className="w-5 h-5 mr-2" />
                                ) : (
                                    <ArrowRightIcon className="w-5 h-5 mr-2" />
                                )}
                                {isLoading ? 'Verificando...' : 'Ingresar'}
                            </Button>
                        </div>
                    </form>
                </div>
                 <footer className="w-full text-center py-8 text-gray-500 text-sm">
                    Copyright © 2025 Centro Comenius. Todos los derechos reservados.
                </footer>
            </div>
        </div>
    );
};