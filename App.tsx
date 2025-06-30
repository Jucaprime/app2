
import React, { useState, useEffect, useCallback, useMemo, createContext, useContext, ReactNode } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { generateTransactionsFromText, generateServiceOrder } from './services/geminiService';
import { Page, Transaction, TransactionType, User, Preset, PaymentMethod, GeminiTransaction } from './types';
import { auth, db } from './firebase';
import {
    onAuthStateChanged,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    User as FirebaseUser
} from 'firebase/auth';
import {
    collection,
    query,
    onSnapshot,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    orderBy,
    limit,
    serverTimestamp,
    Timestamp,
    writeBatch,
    getDocs
} from 'firebase/firestore';


// Type definitions for Web Speech API and CDN-loaded jsPDF
interface SpeechRecognition {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    onend: (() => void) | null;
    onerror: ((event: any) => void) | null;
    onresult: ((event: any) => void) | null;
    start(): void;
    stop(): void;
}

interface SpeechRecognitionStatic {
    new(): SpeechRecognition;
}

declare global {
    interface Window {
        jspdf: any;
        SpeechRecognition: SpeechRecognitionStatic;
        webkitSpeechRecognition: SpeechRecognitionStatic;
    }
}


// --- ICONS (as components) ---
const Icon = ({ path, className }: { path: string, className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`w-5 h-5 ${className}`}>
        <path fillRule="evenodd" d={path} clipRule="evenodd" />
    </svg>
);

const WalletIcon = (props: { className?: string }) => <Icon {...props} path="M18 10a2 2 0 01-2-2V4a2 2 0 00-2-2H4a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-4a2 2 0 012-2h2a2 2 0 002-2v-4a2 2 0 00-2-2h-2zm-4-2V4h2v4h-2zM4 4h10v12H4V4z" />;
const DashboardIcon = (props: { className?: string }) => <Icon {...props} path="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z" />;
const TransactionsIcon = (props: { className?: string }) => <Icon {...props} path="M8 7a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1zm2 3a1 1 0 00-1 1v2a1 1 0 102 0v-2a1 1 0 00-1-1z" />;
const ReportsIcon = (props: { className?: string }) => <Icon {...props} path="M2 11h6a1 1 0 011 1v6a1 1 0 01-1 1H2a1 1 0 01-1-1v-6a1 1 0 011-1zm9-9h6a1 1 0 011 1v6a1 1 0 01-1 1h-6a1 1 0 01-1-1V3a1 1 0 011-1zm0 10h6a1 1 0 011 1v2a1 1 0 01-1 1h-6a1 1 0 01-1-1v-2a1 1 0 011-1zM3 2a1 1 0 00-1 1v2a1 1 0 001 1h6a1 1 0 001-1V3a1 1 0 00-1-1H3z" />;
const ServiceOrderIcon = (props: { className?: string }) => <Icon {...props} path="M3 3a2 2 0 00-2 2v10a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2H3zm3 4a1 1 0 100 2h8a1 1 0 100-2H6z" />;
const SettingsIcon = (props: { className?: string }) => <Icon {...props} path="M5.05 4.05a7 7 0 119.9 9.9L10 14.01l-4.95-4.95a7 7 0 010-9.9zM10 11a1 1 0 100-2 1 1 0 000 2z" />;
const LogoutIcon = (props: { className?: string }) => <Icon {...props} path="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L10 5.414l5.293 5.293a1 1 0 001.414-1.414l-7-7z" />;
const PlusIcon = (props: { className?: string }) => <Icon {...props} path="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" />;
const MagicIcon = (props: { className?: string }) => <Icon {...props} path="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.28 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />;
const CloseIcon = (props: { className?: string }) => <Icon {...props} path="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" />;
const EditIcon = (props: { className?: string }) => <Icon {...props} path="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />;
const DeleteIcon = (props: { className?: string }) => <Icon {...props} path="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V4a2 2 0 00-2-2H6zM14 4H6v12h8V4zm-2 2a1 1 0 01-1 1H9a1 1 0 01-1-1V5a1 1 0 011-1h2a1 1 0 011 1v1z" />;
const SpinnerIcon = (props: { className?: string }) => (
    <svg className={`animate-spin h-5 w-5 text-white ${props.className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);
const MicrophoneIcon = (props: { className?: string }) => <Icon {...props} path="M7 4a3 3 0 016 0v6a3 3 0 11-6 0V4zM13 10a1 1 0 10-2 0v1.372A5.003 5.003 0 015.372 15H5a1 1 0 100 2h1.372A5.003 5.003 0 0110 18.628V20a1 1 0 102 0v-1.372a5.003 5.003 0 014.628-4.256H17a1 1 0 100-2h-.372a5.003 5.003 0 01-4.256-4.628V10z" />;

// --- UTILS ---
const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('pt-BR', { timeZone: 'UTC' });

// --- CONTEXT ---
interface AppContextType {
    user: User | null;
    transactions: Transaction[];
    presets: Preset[];
    page: Page;
    serviceOrderHistory: string[];
    setPage: (page: Page) => void;
    addTransaction: (tx: Omit<Transaction, 'id'>) => Promise<void>;
    updateTransaction: (tx: Transaction) => Promise<void>;
    deleteTransaction: (id: string) => Promise<void>;
    addMultipleTransactions: (txs: GeminiTransaction[]) => Promise<void>;
    addServiceOrderToHistory: (order: string) => Promise<void>;
    showAlert: (message: string) => void;
}

const AppContext = createContext<AppContextType | null>(null);
const useAppContext = () => {
    const context = useContext(AppContext);
    if (!context) throw new Error("useAppContext must be used within an AppProvider");
    return context;
};

// --- UI Components ---
const Card = ({ children, className, style, onClick }: { children: ReactNode, className?: string, style?: React.CSSProperties, onClick?: () => void }) => (
    <div style={style} onClick={onClick} className={`bg-neutral-900 border border-neutral-800 rounded-2xl shadow-lg p-6 group transition-all duration-300 hover:border-blue-500/50 hover:shadow-blue-500/10 ${className}`}>
        {children}
    </div>
);

const Button = ({ children, onClick, className = 'from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-500', type = 'button', disabled = false }: { children: ReactNode, onClick?: () => void, className?: string, type?: 'button' | 'submit' | 'reset', disabled?: boolean }) => (
    <button type={type} onClick={onClick} disabled={disabled} className={`bg-gradient-to-r text-white font-bold py-2.5 px-5 rounded-lg transition-all duration-300 transform hover:scale-[1.03] shadow-lg hover:shadow-blue-500/30 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:transform-none ${className}`}>
        {children}
    </button>
);

const Modal = ({ children, isOpen, onClose, title, size = 'md' }: { children: ReactNode, isOpen: boolean, onClose: () => void, title: string, size?: 'md' | 'xl' | '4xl' }) => {
    if (!isOpen) return null;
    const sizeClasses = {
        md: 'max-w-md',
        xl: 'max-w-xl',
        '4xl': 'max-w-4xl'
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className={`bg-neutral-900/80 backdrop-blur-xl border border-neutral-700/80 rounded-2xl w-full ${sizeClasses[size]} shadow-2xl animate-fade-in-up h-auto max-h-[90vh] flex flex-col`}>
                <div className="flex-shrink-0 flex justify-between items-center p-5 border-b border-neutral-800">
                    <h2 className="text-xl font-bold text-neutral-100">{title}</h2>
                    <button onClick={onClose} className="text-neutral-500 hover:text-white transition-colors"><CloseIcon /></button>
                </div>
                <div className="p-6 flex-1 overflow-y-auto">{children}</div>
            </div>
        </div>
    );
};


// --- APP LAYOUT COMPONENTS ---

const Header = () => {
    const { page, user } = useAppContext();
    const [isTxModalOpen, setTxModalOpen] = useState(false);
    const [isGeminiModalOpen, setGeminiModalOpen] = useState(false);

    const pageTitles: Record<Page, string> = {
        [Page.Dashboard]: 'Visão Geral',
        [Page.Transactions]: 'Transações',
        [Page.Reports]: 'Relatórios',
        [Page.ServiceOrder]: 'Gerador de O.S.',
        [Page.Settings]: 'Configurações',
    };
    const userInitials = user?.email.substring(0, 2).toUpperCase() || '..';

    return (
        <>
            <header className="h-20 bg-neutral-950/80 backdrop-blur-lg border-b border-neutral-800 flex items-center justify-between px-6 flex-shrink-0">
                <h1 className="text-2xl font-bold text-neutral-100">{pageTitles[page]}</h1>
                <div className="flex items-center gap-4">
                    <Button onClick={() => setGeminiModalOpen(true)} className="from-purple-600 to-fuchsia-500 hover:from-purple-500 hover:to-fuchsia-500 shadow-purple-500/20 hover:shadow-purple-500/40 hidden md:flex">
                        <MagicIcon /> <span className="hidden lg:inline">Criar com IA</span>
                    </Button>
                    <Button onClick={() => setTxModalOpen(true)}>
                        <PlusIcon /> <span className="hidden lg:inline">Nova Transação</span>
                    </Button>
                    <div className="w-11 h-11 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center font-bold text-white cursor-pointer transition-all hover:ring-2 hover:ring-offset-2 hover:ring-offset-neutral-950 hover:ring-blue-400">
                        {userInitials}
                    </div>
                </div>
            </header>
            <TransactionModal isOpen={isTxModalOpen} onClose={() => setTxModalOpen(false)} />
            <GeminiModal isOpen={isGeminiModalOpen} onClose={() => setGeminiModalOpen(false)} />
        </>
    );
};

const Sidebar = () => {
    const { page, setPage } = useAppContext();

    const handleLogout = async () => {
        try {
            await signOut(auth);
        } catch (error) {
            console.error("Error signing out: ", error);
        }
    };

    const NavItem = ({ icon, label, pageName }: { icon: ReactNode, label: string, pageName: Page }) => (
        <a href="#" onClick={(e) => { e.preventDefault(); setPage(pageName); }}
           className={`flex items-center px-4 py-3 rounded-lg transition-all duration-200 font-bold text-lg relative ${page === pageName ? 'text-white' : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'}`}>
            {page === pageName && <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 bg-blue-500 rounded-r-full"></span>}
            {icon}
            <span className="ml-4">{label}</span>
        </a>
    );

    return (
        <aside className="w-64 flex-shrink-0 bg-neutral-900 flex-col hidden md:flex border-r border-neutral-800">
            <div className="h-20 flex items-center justify-center text-3xl font-bold border-b border-neutral-800">
                <WalletIcon className="text-blue-500 mr-3 w-8 h-8" />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-neutral-400">Finanças</span>
            </div>
            <nav className="flex-1 px-4 py-6 space-y-2">
                <NavItem icon={<DashboardIcon />} label="Dashboard" pageName={Page.Dashboard} />
                <NavItem icon={<TransactionsIcon />} label="Transações" pageName={Page.Transactions} />
                <NavItem icon={<ReportsIcon />} label="Relatórios" pageName={Page.Reports} />
                <NavItem icon={<ServiceOrderIcon />} label="Ordem de Serviço" pageName={Page.ServiceOrder} />
                <NavItem icon={<SettingsIcon />} label="Configurações" pageName={Page.Settings} />
            </nav>
            <div className="p-4 border-t border-neutral-800">
                <a href="#" onClick={(e) => { e.preventDefault(); handleLogout(); }}
                   className="flex items-center px-4 py-3 rounded-lg text-red-500 hover:bg-red-500/10 hover:text-red-400 transition-colors duration-200 font-bold text-lg">
                    <LogoutIcon className="transform -rotate-90"/>
                    <span className="ml-4">Sair</span>
                </a>
            </div>
        </aside>
    );
};


// --- PAGE COMPONENTS ---

const DashboardPage = () => {
    const { transactions } = useAppContext();

    const { monthlyIncome, monthlyExpense } = useMemo(() => {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const thisMonthTxs = transactions.filter(tx => new Date(tx.date) >= startOfMonth);

        const income = thisMonthTxs
            .filter(t => t.type === TransactionType.Income)
            .reduce((sum, t) => sum + t.amount, 0);
        const expense = thisMonthTxs
            .filter(t => t.type === TransactionType.Expense)
            .reduce((sum, t) => sum + t.amount, 0);

        return { monthlyIncome: income, monthlyExpense: expense };
    }, [transactions]);
    
    const annualSummary = useMemo(() => {
        const currentYear = new Date().getFullYear();
        const thisYearTxs = transactions.filter(tx => new Date(tx.date).getFullYear() === currentYear);

        const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
        const yearlyData = monthNames.map(name => ({
            name,
            Entradas: 0,
            Saídas: 0,
        }));

        thisYearTxs.forEach(tx => {
            const monthIndex = new Date(tx.date).getMonth();
            if (tx.type === TransactionType.Income) {
                yearlyData[monthIndex].Entradas += tx.amount;
            } else {
                yearlyData[monthIndex].Saídas += tx.amount;
            }
        });
        
        return yearlyData;
    }, [transactions]);

    return (
        <main className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                <Card className="animate-fade-in-up" style={{ animationDelay: '100ms' }}>
                    <h3 className="text-sm font-medium text-neutral-400">Entradas (Mês)</h3>
                    <p className="text-3xl font-bold text-green-400 mt-2">{formatCurrency(monthlyIncome)}</p>
                </Card>
                <Card className="animate-fade-in-up" style={{ animationDelay: '200ms' }}>
                    <h3 className="text-sm font-medium text-neutral-400">Saídas (Mês)</h3>
                    <p className="text-3xl font-bold text-red-400 mt-2">{formatCurrency(monthlyExpense)}</p>
                </Card>
                <Card className="animate-fade-in-up" style={{ animationDelay: '300ms' }}>
                    <h3 className="text-sm font-medium text-neutral-400">Total de Transações</h3>
                    <p className="text-3xl font-bold text-neutral-300 mt-2">{transactions.length}</p>
                </Card>
            </div>
            <Card className="animate-fade-in-up" style={{ animationDelay: '400ms' }}>
                <h3 className="font-semibold mb-4 text-lg text-neutral-200">Resumo Anual</h3>
                <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={annualSummary} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                            <XAxis dataKey="name" stroke="#a3a3a3" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis stroke="#a3a3a3" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${formatCurrency(value as number).replace('R$', '')}`} />
                            <Tooltip contentStyle={{ backgroundColor: 'rgba(23, 23, 23, 0.8)', backdropFilter: 'blur(4px)', border: '1px solid #404040', borderRadius: '0.75rem' }} cursor={{ fill: 'rgba(30, 64, 175, 0.1)' }}/>
                            <Legend wrapperStyle={{fontSize: "14px"}}/>
                            <Bar dataKey="Entradas" fill="#2563eb" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="Saídas" fill="#f97316" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </Card>
        </main>
    );
};

const TransactionsPage = () => {
    const { transactions, deleteTransaction, showAlert } = useAppContext();
    const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all');
    const [editingTx, setEditingTx] = useState<Transaction | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    
    const filteredTransactions = useMemo(() => {
        const sortedTransactions = [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        if (filter === 'all') {
            return sortedTransactions;
        }
        return sortedTransactions.filter(tx => tx.type === filter);
    }, [transactions, filter]);

    const handleDelete = async () => {
        if (deletingId) {
            try {
                await deleteTransaction(deletingId);
                showAlert('Transação excluída com sucesso.');
            } catch (error) {
                showAlert('Erro ao excluir transação.');
                console.error(error);
            } finally {
                setDeletingId(null);
            }
        }
    };

    return (
        <>
            <main className="p-8">
                <Card>
                    <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-4">
                        <h3 className="font-semibold text-lg text-neutral-200">Todas as Transações</h3>
                        <div className="flex items-center gap-1 rounded-lg p-1 bg-neutral-800 self-start">
                            {(['all', 'income', 'expense'] as const).map(f => (
                                <button key={f} onClick={() => setFilter(f)}
                                    className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-colors ${filter === f ? 'bg-blue-600 text-white shadow' : 'text-neutral-300 hover:bg-neutral-700'}`}>
                                    {f === 'all' ? 'Todas' : f === 'income' ? 'Entradas' : 'Saídas'}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left min-w-[600px]">
                            <thead className="border-b-2 border-neutral-800">
                                <tr>
                                    <th className="p-4 font-semibold text-neutral-400 text-sm">Descrição</th>
                                    <th className="p-4 font-semibold text-neutral-400 text-sm">Forma Pag.</th>
                                    <th className="p-4 font-semibold text-neutral-400 text-sm">Data</th>
                                    <th className="p-4 font-semibold text-neutral-400 text-sm">Tipo</th>
                                    <th className="p-4 font-semibold text-neutral-400 text-sm text-right">Valor</th>
                                    <th className="p-4 font-semibold text-neutral-400 text-sm text-center">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredTransactions.map((tx, index) => {
                                    const paymentMethodsText = tx.type === 'income' 
                                        ? tx.paymentMethods.map(p => p.method).join(' / ') || 'N/A'
                                        : 'N/A';
                                    return (
                                    <tr key={tx.id} className="border-b border-neutral-800/70 hover:bg-neutral-800/60 transition-colors animate-fade-in-up" style={{ animationDelay: `${index * 30}ms` }}>
                                        <td className="p-4 font-medium text-neutral-200">{tx.description}</td>
                                        <td className="p-4 text-neutral-400">{paymentMethodsText}</td>
                                        <td className="p-4 text-neutral-400">{formatDate(tx.date)}</td>
                                        <td className="p-4">
                                            <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${tx.type === 'income' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                                                {tx.type === 'income' ? 'Entrada' : 'Saída'}
                                            </span>
                                        </td>
                                        <td className={`p-4 text-right font-bold ${tx.type === 'income' ? 'text-green-400' : 'text-red-400'}`}>{formatCurrency(tx.amount)}</td>
                                        <td className="p-4 text-center space-x-4">
                                            <button onClick={() => setEditingTx(tx)} className="text-neutral-500 hover:text-blue-400 transition-colors"><EditIcon /></button>
                                            <button onClick={() => setDeletingId(tx.id)} className="text-neutral-500 hover:text-red-400 transition-colors"><DeleteIcon /></button>
                                        </td>
                                    </tr>
                                )})}
                            </tbody>
                        </table>
                        {filteredTransactions.length === 0 && (
                            <div className="text-center py-20 text-neutral-500">
                                <p className="font-medium text-lg">Nenhuma transação encontrada.</p>
                                <p className="text-sm">Tente ajustar os filtros ou adicione uma nova transação.</p>
                            </div>
                        )}
                    </div>
                </Card>
            </main>
            {editingTx && <TransactionModal isOpen={!!editingTx} onClose={() => setEditingTx(null)} transaction={editingTx} />}
            <Modal isOpen={!!deletingId} onClose={() => setDeletingId(null)} title="Confirmar Exclusão">
                <p className="text-neutral-300 mb-6">Tem certeza que deseja excluir esta transação?</p>
                <div className="flex justify-end gap-4">
                    <Button onClick={() => setDeletingId(null)} className="bg-neutral-600 hover:bg-neutral-500 from-neutral-600 to-neutral-500 shadow-none">Cancelar</Button>
                    <Button onClick={handleDelete} className="bg-red-600 hover:bg-red-500 from-red-600 to-red-500 shadow-red-500/20 hover:shadow-red-500/40">Excluir</Button>
                </div>
            </Modal>
        </>
    );
};

const ReportsPage = () => {
    const { transactions } = useAppContext();
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
    const [activeTab, setActiveTab] = useState<'income' | 'expense'>('income');
    const [detailsModalState, setDetailsModalState] = useState<{ isOpen: boolean; title: string; transactions: Transaction[] }>({
        isOpen: false,
        title: '',
        transactions: []
    });

    const { availableMonths, reportData } = useMemo(() => {
        const months = [...new Set(transactions.map(tx => new Date(tx.date).toISOString().slice(0, 7)))].sort().reverse();
        
        const monthTxs = transactions.filter(tx => new Date(tx.date).toISOString().slice(0, 7) === selectedMonth);
        const incomeTxs = monthTxs.filter(tx => tx.type === 'income').sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        const expenseTxs = monthTxs.filter(tx => tx.type === 'expense').sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        const totalIncome = incomeTxs.reduce((sum, tx) => sum + tx.amount, 0);
        const totalExpense = expenseTxs.reduce((sum, tx) => sum + tx.amount, 0);

        const paymentMethodTotals = incomeTxs.reduce((acc, tx) => {
            (tx.paymentMethods || []).forEach(pm => {
                acc[pm.method] = (acc[pm.method] || 0) + pm.amount;
            });
            return acc;
        }, {} as Record<string, number>);

        const cashIncome = paymentMethodTotals['Dinheiro'] || 0;

        const selectedMonthDate = new Date(selectedMonth + '-02');
        selectedMonthDate.setMonth(selectedMonthDate.getMonth() - 1);
        const prevMonthStr = selectedMonthDate.toISOString().slice(0, 7);

        const prevMonthTxs = transactions.filter(tx => new Date(tx.date).toISOString().slice(0, 7) === prevMonthStr);
        
        const prevMonthIncomeTxs = prevMonthTxs.filter(tx => tx.type === 'income');
        const prevMonthCashIncome = prevMonthIncomeTxs
            .flatMap(tx => tx.paymentMethods)
            .filter(pm => pm.method === 'Dinheiro')
            .reduce((sum, pm) => sum + pm.amount, 0);

        const prevMonthTotalExpense = prevMonthTxs
            .filter(tx => tx.type === 'expense')
            .reduce((sum, tx) => sum + tx.amount, 0);
            
        const prevMonthBalance = prevMonthCashIncome - prevMonthTotalExpense;

        return {
            availableMonths: months,
            reportData: { 
                incomeTxs, 
                expenseTxs, 
                totalIncome, 
                totalExpense, 
                paymentMethodTotals, 
                cashIncome,
                prevMonthBalance
            }
        };
    }, [transactions, selectedMonth]);

    const handleOpenDetailsModal = (type: 'income' | 'expense') => {
        setDetailsModalState({
            isOpen: true,
            title: type === 'income' ? 'Detalhes das Entradas' : 'Detalhes das Saídas',
            transactions: type === 'income' ? reportData.incomeTxs : reportData.expenseTxs
        });
    };

    const handleExportPDF = () => {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'pt');
        const now = new Date();
        const generationDate = now.toLocaleDateString('pt-BR');
        const generationTime = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit'});

        // Colors and Fonts
        const primaryColor = '#2563eb'; // blue-600
        const secondaryColor = '#93c5fd'; // blue-300
        const textColor = '#171717'; // neutral-900
        const lightTextColor = '#525252'; // neutral-600
        const greenColor = '#16a34a';
        const redColor = '#dc2626';
        const lightGreenBg = '#f0fdf4';
        const lightRedBg = '#fef2f2';
        const tableHeaderBg = '#1d4ed8'; // blue-700
        
        // This is a placeholder. For production, you'd bundle the font file.
        // doc.addFont('js/Inter-Regular.ttf', 'Inter', 'normal');
        doc.setFont('helvetica', 'normal');

        const addHeaderAndFooter = () => {
            const pageCount = doc.internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                
                doc.setFontSize(8);
                doc.setTextColor(lightTextColor);
                const footerText = 'Relatório Financeiro - Documento Confidencial';
                const pageNumText = `${i} / ${pageCount}`;
                doc.text(footerText, 40, doc.internal.pageSize.height - 30);
                doc.text(pageNumText, doc.internal.pageSize.width / 2, doc.internal.pageSize.height - 30, { align: 'center' });
                doc.text(`Gerado: ${generationDate} - ${generationTime}`, doc.internal.pageSize.width - 40, doc.internal.pageSize.height - 30, { align: 'right' });
            }
        };

        let startY = 40;
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(primaryColor);
        doc.text('RELATÓRIO FINANCEIRO', doc.internal.pageSize.width / 2, startY, { align: 'center' });
        startY += 20;

        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(lightTextColor);
        const monthName = new Date(selectedMonth + '-02').toLocaleString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase();
        doc.text(monthName, doc.internal.pageSize.width / 2, startY, { align: 'center' });
        startY += 15;

        doc.setFontSize(8);
        doc.text(`Gerado em ${generationDate} às ${generationTime}`, doc.internal.pageSize.width / 2, startY, { align: 'center' });
        startY += 30;

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(primaryColor);
        doc.text('RESUMO EXECUTIVO', 40, startY);
        startY += 8;
        doc.setDrawColor(secondaryColor);
        doc.setLineWidth(2);
        doc.line(40, startY, doc.internal.pageSize.width - 40, startY);
        startY += 25;

        (doc as any).autoTable({
            body: [
                ['Saldo Anterior:', { content: formatCurrency(reportData.prevMonthBalance), styles: { halign: 'right' } }],
                ['Entradas em Dinheiro:', { content: formatCurrency(reportData.cashIncome), styles: { halign: 'right', textColor: greenColor } }],
                ['Total de Saídas:', { content: formatCurrency(reportData.totalExpense), styles: { halign: 'right', textColor: redColor } }],
                ['Resultado do Mês:', { content: formatCurrency(reportData.cashIncome - reportData.totalExpense), styles: { halign: 'right', fontStyle: 'bold' } }],
            ],
            startY: startY,
            theme: 'grid',
            styles: { fontSize: 11, cellPadding: { top: 8, right: 10, bottom: 8, left: 10 }, textColor: textColor, lineColor: '#e5e5e5', lineWidth: 0.5 },
            didDrawPage: (data:any) => { startY = data.cursor.y; },
        });
        startY = (doc as any).lastAutoTable.finalY + 15;
        
        doc.setFillColor(lightGreenBg);
        doc.roundedRect(40, startY, doc.internal.pageSize.width - 80, 40, 5, 5, 'F');
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(textColor);
        doc.text('SALDO ATUAL DO CAIXA:', 60, startY + 25, { baseline: 'middle' });
        doc.setFontSize(16);
        doc.text(formatCurrency(reportData.prevMonthBalance + reportData.cashIncome - reportData.totalExpense), doc.internal.pageSize.width - 60, startY + 25, { align: 'right', baseline: 'middle' });
        startY += 60;
        
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(primaryColor);
        doc.text('ENTRADAS POR FORMA DE PAGAMENTO', 40, startY);
        startY += 8;
        doc.setDrawColor(secondaryColor);
        doc.setLineWidth(2);
        doc.line(40, startY, doc.internal.pageSize.width - 40, startY);
        startY += 25;
        
        (doc as any).autoTable({
            body: Object.entries(reportData.paymentMethodTotals).map(([method, amount]) => [
                method, { content: formatCurrency(amount), styles: { halign: 'right', textColor: greenColor } }
            ]),
            startY: startY,
            theme: 'grid',
            styles: { fontSize: 11, cellPadding: 8, textColor: textColor, lineColor: '#e5e5e5', lineWidth: 0.5 },
            footStyles: { fillColor: false, textColor: textColor, fontStyle: 'bold', lineWidth: { top: 1.5 }, lineColor: { top: textColor } },
            foot: [['TOTAL GERAL DE ENTRADAS:', { content: formatCurrency(reportData.totalIncome), styles: { halign: 'right', fontStyle: 'bold', fontSize: 14 } }]],
            didDrawPage: (data:any) => { startY = data.cursor.y; },
        });
        startY = (doc as any).lastAutoTable.finalY;

        const drawDetailsPage = (title: string, recordCount: number, totalAmount: number, headers: string[], body: any[][], color: string, subtotalBgColor: string) => {
            (doc as any).autoTable({
                head: [
                    [{ content: `\n${title}`, colSpan: headers.length, styles: { halign: 'left', fontStyle: 'bold', fontSize: 14, textColor: primaryColor, cellPadding: { left: 0, top: 20, bottom: 0 } } }],
                    [{ content: `${recordCount} registros | Total: ${formatCurrency(totalAmount)}`, colSpan: headers.length, styles: { halign: 'left', fontSize: 9, textColor: lightTextColor, cellPadding: { left: 0, bottom: 8 } } }],
                    [{ content: '', colSpan: headers.length, styles: { fillColor: secondaryColor, minCellHeight: 2, cellPadding: 0 } }],
                    headers,
                ],
                body: body,
                startY: startY + 30,
                theme: 'plain',
                margin: { top: 40, left: 40, right: 40 },
                styles: { fontSize: 9, textColor: textColor, cellPadding: { vertical: 6, horizontal: 4 } },
                headStyles: {
                    valign: 'middle',
                    lineWidth: 0,
                    textColor: 'white',
                    fillColor: tableHeaderBg,
                    fontStyle: 'bold'
                },
                columnStyles: {
                    [headers.length - 1]: { halign: 'right' },
                },
                alternateRowStyles: {
                    fillColor: '#f5f5f5' // neutral-100
                },
                willDrawCell: (data: any) => {
                    if (data.section === 'body' && data.column.index === headers.length - 1) {
                        data.cell.styles.textColor = color;
                        data.cell.styles.fontStyle = 'bold';
                    }
                },
                foot: [[
                    { content: `SUBTOTAL ${title.toUpperCase()}:`, colSpan: headers.length - 1, styles: { halign: 'right', fontStyle: 'bold', fontSize: 11, cellPadding: 10 } },
                    { content: formatCurrency(totalAmount), styles: { halign: 'right', fontStyle: 'bold', fontSize: 11, textColor: color, cellPadding: 10 } }
                ]],
                footStyles: {
                    lineWidth: 0,
                    fillColor: subtotalBgColor,
                },
                didDrawPage: (data: any) => { startY = 40; },
            });
            startY = (doc as any).lastAutoTable.finalY;
        };

        drawDetailsPage(
            'DETALHES DAS ENTRADAS',
            reportData.incomeTxs.length,
            reportData.totalIncome,
            ['DESCRICAO', 'PAGAMENTO', 'DATA', 'VALOR'],
            reportData.incomeTxs.map(tx => [tx.description, tx.paymentMethods.map(p => p.method).join(' / '), formatDate(tx.date), formatCurrency(tx.amount)]),
            greenColor,
            lightGreenBg
        );
        
        drawDetailsPage(
            'DETALHES DAS SAÍDAS',
            reportData.expenseTxs.length,
            reportData.totalExpense,
            ['DESCRICAO', 'DATA', 'VALOR'],
            reportData.expenseTxs.map(tx => [tx.description, formatDate(tx.date), formatCurrency(tx.amount)]),
            redColor,
            lightRedBg
        );

        addHeaderAndFooter();
        
        doc.save(`relatorio_financeiro_${selectedMonth}.pdf`);
    };

    return (
        <>
            <main className="p-8">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6 gap-4">
                    <h3 className="font-semibold text-xl text-neutral-200">Análise Mensal</h3>
                    <div className="flex items-center gap-4">
                        <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="bg-neutral-800 border border-neutral-700 p-2.5 rounded-lg text-white">
                            {availableMonths.map(m => (
                                <option key={m} value={m}>{new Date(m + '-02').toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}</option>
                            ))}
                        </select>
                        <Button onClick={handleExportPDF} className="bg-neutral-700 from-neutral-700 to-neutral-600 shadow-none">Exportar PDF</Button>
                    </div>
                </div>

                <div className="flex flex-col gap-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
                        <Card>
                            <h4 className="font-semibold text-md mb-4 text-neutral-300">Resumo do Mês</h4>
                            <div className="space-y-4 text-base text-neutral-300">
                                <div className="flex justify-between items-baseline"><span className="text-neutral-400">Saldo Mês Anterior:</span><span className="font-medium">{formatCurrency(reportData.prevMonthBalance)}</span></div>
                                <div className="flex justify-between items-baseline"><span className="text-neutral-400">Entradas em Dinheiro:</span><span className="font-medium text-green-400">{formatCurrency(reportData.cashIncome)}</span></div>
                                <div className="flex justify-between items-baseline"><span className="text-neutral-400">Total Saídas:</span><span className="font-medium text-red-400">{formatCurrency(reportData.totalExpense)}</span></div>
                            </div>
                            <div className="border-t border-neutral-800 mt-5 pt-5 flex justify-between items-center">
                                <span className="font-semibold text-lg text-neutral-300">Saldo do Caixa:</span><span className="font-bold text-3xl text-blue-400">{formatCurrency(reportData.prevMonthBalance + reportData.cashIncome - reportData.totalExpense)}</span>
                            </div>
                        </Card>
                        <Card>
                            <h4 className="font-semibold text-md mb-4 text-neutral-300">Entradas por Pagamento</h4>
                            <div className="space-y-4">
                                {Object.entries(reportData.paymentMethodTotals).map(([method, amount]) => (
                                <div key={method} className="flex justify-between text-base items-baseline"><span className="text-neutral-400">{method}</span><span className="font-medium text-neutral-200">{formatCurrency(amount)}</span></div>
                                ))}
                            </div>
                            <div className="border-t border-neutral-800 mt-5 pt-5 flex justify-between items-center">
                                <span className="font-semibold text-lg text-neutral-300">Total Entradas</span>
                                <span className="font-bold text-2xl text-green-400">{formatCurrency(reportData.totalIncome)}</span>
                            </div>
                        </Card>
                    </div>

                    <div className="animate-fade-in-up" style={{ animationDelay: '200ms' }}>
                         <Card 
                            className="relative cursor-pointer"
                            onClick={() => handleOpenDetailsModal(activeTab)}
                        >
                            <div className="flex border-b border-neutral-800 mb-4">
                                <button onClick={(e) => { e.stopPropagation(); setActiveTab('income') }} className={`py-2 px-4 font-medium text-sm border-b-2 ${activeTab === 'income' ? 'border-blue-500 text-blue-400' : 'border-transparent text-neutral-400'}`}>Entradas</button>
                                <button onClick={(e) => { e.stopPropagation(); setActiveTab('expense') }} className={`py-2 px-4 font-medium text-sm border-b-2 ${activeTab === 'expense' ? 'border-blue-500 text-blue-400' : 'border-transparent text-neutral-400'}`}>Saídas</button>
                            </div>
                            <div className="overflow-y-auto max-h-[26rem]">
                                <table className="w-full text-left">
                                    <tbody>
                                        {(activeTab === 'income' ? reportData.incomeTxs : reportData.expenseTxs).map(tx => (
                                            <tr key={tx.id} className="border-b border-neutral-800/50">
                                                <td className="p-3 text-neutral-300">{tx.description}</td>
                                                <td className="p-3 text-neutral-400">{formatDate(tx.date)}</td>
                                                <td className={`p-3 text-right font-semibold ${tx.type === 'income' ? 'text-green-400' : 'text-red-400'}`}>{formatCurrency(tx.amount)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                             <div className="absolute inset-0 bg-neutral-900/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                                <p className="font-bold text-white bg-black/50 px-4 py-2 rounded-lg">Ver Detalhes</p>
                            </div>
                        </Card>
                    </div>
                </div>
            </main>
            <DetailsModal 
                isOpen={detailsModalState.isOpen}
                onClose={() => setDetailsModalState({ ...detailsModalState, isOpen: false })}
                title={detailsModalState.title}
                transactions={detailsModalState.transactions}
            />
        </>
    );
};

const ServiceOrderPage = () => {
    const { showAlert, serviceOrderHistory, addServiceOrderToHistory } = useAppContext();
    const [transcript, setTranscript] = useState('');
    const [isRecording, setIsRecording] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [output, setOutput] = useState('');
    const recognitionRef = React.useRef<SpeechRecognition | null>(null);

    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            showAlert("Seu navegador não suporta a API de Reconhecimento de Voz.");
            return;
        }
        const recognition = new SpeechRecognition();
        recognition.lang = 'pt-BR';
        recognition.interimResults = true;
        recognition.continuous = true;
        
        recognition.onresult = (event) => {
            let final_transcript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    final_transcript += event.results[i][0].transcript;
                }
            }
            setTranscript(prev => prev + final_transcript);
        };
        recognition.onend = () => {
            setIsRecording(false);
        };
        recognition.onerror = (event) => {
            if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
                showAlert("A permissão para o microfone foi negada. Você precisa habilitá-la nas configurações do seu navegador.");
            }
        };
        recognitionRef.current = recognition;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleRecord = () => {
        if (!recognitionRef.current) return;
        if (isRecording) {
            recognitionRef.current.stop();
        } else {
            setTranscript('');
            recognitionRef.current.start();
            setIsRecording(true);
        }
    };
    
    const handleGenerate = async () => {
        if (!transcript.trim()) {
            showAlert('Por favor, grave ou digite os detalhes do serviço.');
            return;
        }
        setIsLoading(true);
        setOutput('');
        try {
            const result = await generateServiceOrder(transcript);
            setOutput(result);
            await addServiceOrderToHistory(result);
        } catch (error) {
            const message = error instanceof Error ? error.message : "Ocorreu um erro desconhecido.";
            showAlert(message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCopy = (textToCopy: string, type: 'main' | 'history') => {
        navigator.clipboard.writeText(textToCopy);
        showAlert(type === 'main' ? "Ordem de Serviço copiada!" : "Histórico copiado!");
    };

    return (
        <main className="p-8">
            <Card className="max-w-3xl mx-auto">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-white">Gerador de Ordem de Serviço</h1>
                    <p className="text-neutral-400 mt-2">Dite ou digite os detalhes e a IA criará a O.S. para você.</p>
                </div>

                <div className="mb-6">
                    <label htmlFor="voice-input" className="block text-sm font-medium text-neutral-300 mb-2">Texto Transcrito/Digitado:</label>
                    <textarea id="voice-input" rows={5} value={transcript} onChange={e => setTranscript(e.target.value)}
                        className="w-full p-3 bg-neutral-800 border border-neutral-700 rounded-lg focus:ring-2 focus:ring-blue-500 transition"
                        placeholder="A transcrição do seu áudio aparecerá aqui..." />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                    <Button onClick={handleRecord} className={`${isRecording ? 'from-red-700 to-red-600' : 'from-red-600 to-rose-500'}`}>
                        <MicrophoneIcon /> <span>{isRecording ? 'Parar' : 'Gravar'}</span>
                    </Button>
                    <Button onClick={handleGenerate} disabled={isLoading}>
                        {isLoading ? <SpinnerIcon /> : <MagicIcon />} <span>Gerar O.S.</span>
                    </Button>
                    <Button onClick={() => { setTranscript(''); setOutput(''); }} className="from-neutral-600 to-neutral-500">
                        <DeleteIcon /> <span>Limpar</span>
                    </Button>
                </div>

                {isLoading && (
                    <div className="text-center my-4 text-blue-400 font-semibold flex items-center justify-center gap-3">
                        <SpinnerIcon /> Aguarde, o Gemini está processando...
                    </div>
                )}
                
                {output && (
                    <div className="animate-fade-in">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="text-lg font-semibold text-white">Ordem de Serviço (Editável):</h3>
                            <Button onClick={() => handleCopy(output, 'main')} className="from-neutral-600 to-neutral-500 text-sm py-1">Copiar</Button>
                        </div>
                        <textarea value={output} onChange={e => setOutput(e.target.value)}
                            className="w-full p-4 border rounded-lg min-h-[300px] bg-neutral-950 text-neutral-300 border-neutral-700 font-mono"></textarea>
                    </div>
                )}
            </Card>

            {serviceOrderHistory.length > 0 && (
                <Card className="max-w-3xl mx-auto mt-8 animate-fade-in">
                    <h3 className="text-xl font-bold text-white mb-4">Histórico de O.S. Recentes</h3>
                    <div className="space-y-6">
                        {serviceOrderHistory.map((order, index) => (
                            <div key={index} className="bg-neutral-900 p-4 rounded-lg border border-neutral-800 animate-fade-in-up" style={{ animationDelay: `${index * 50}ms` }}>
                                <pre className="whitespace-pre-wrap font-mono text-sm text-neutral-300 mb-3 bg-neutral-950 p-3 rounded-md">{order}</pre>
                                <div className="text-right">
                                    <Button onClick={() => handleCopy(order, 'history')} className="from-neutral-600 to-neutral-500 text-xs py-1.5 px-3">
                                        Copiar Histórico
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            )}
        </main>
    );
};

const SettingsPage = () => {
    const { user, presets, showAlert } = useAppContext();
    const [name, setName] = useState(user?.name || '');
    
    const handleSaveProfile = (e: React.FormEvent) => {
        e.preventDefault();
        // In a real app this would call an updateProfile function
        showAlert("Nome do perfil atualizado (simulação).");
    };

    return (
        <main className="p-8">
            <h3 className="font-semibold text-xl mb-6 text-neutral-200">Configurações e Predefinições</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <h4 className="font-semibold text-lg mb-4 text-neutral-200">Perfil</h4>
                    <form onSubmit={handleSaveProfile}>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-neutral-300 mb-1">Email</label>
                                <input type="email" value={user?.email} disabled className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-3 opacity-70 cursor-not-allowed" />
                            </div>
                            <div>
                                <label htmlFor="profile-name-input" className="block text-sm font-medium text-neutral-300 mb-1">Nome de Exibição</label>
                                <input type="text" id="profile-name-input" value={name} onChange={e => setName(e.target.value)} className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-3"/>
                            </div>
                        </div>
                        <Button type="submit" className="w-full mt-6">Salvar Perfil</Button>
                    </form>
                </Card>
                 <Card>
                    <h4 className="font-semibold text-lg mb-4 text-neutral-200">Predefinições</h4>
                    <p className="text-neutral-400 mb-4 text-sm">Gerencie descrições comuns para agilizar o lançamento. (Funcionalidade em desenvolvimento)</p>
                     <div className="space-y-2 max-h-48 overflow-y-auto">
                         {presets.map(p => (
                             <div key={p.id} className="flex justify-between items-center bg-neutral-800 p-3 rounded-lg">
                                 <span className="font-medium text-neutral-300">{p.description}</span>
                                 <span className={`text-xs font-semibold px-2 py-1 rounded-full ${p.type === 'income' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>{p.type === 'income' ? 'Entrada' : 'Saída'}</span>
                             </div>
                         ))}
                     </div>
                </Card>
            </div>
        </main>
    );
};


// --- MODAL COMPONENTS ---

const TransactionModal = ({ isOpen, onClose, transaction }: { isOpen: boolean, onClose: () => void, transaction?: Transaction }) => {
    const { addTransaction, updateTransaction, showAlert } = useAppContext();
    const [desc, setDesc] = useState('');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState('');
    const [type, setType] = useState<TransactionType>(TransactionType.Expense);
    
    const [paymentMethod, setPaymentMethod] = useState('Dinheiro');
    
    const [isSplit, setIsSplit] = useState(false);
    const [paymentMethod1, setPaymentMethod1] = useState('Dinheiro');
    const [amount1, setAmount1] = useState('');
    const [paymentMethod2, setPaymentMethod2] = useState('Cartão');
    const [amount2, setAmount2] = useState('');

    const resetForm = useCallback(() => {
        setDesc('');
        setAmount('');
        setDate(new Date().toISOString().split('T')[0]);
        setType(TransactionType.Expense);
        setIsSplit(false);
        setPaymentMethod('Dinheiro');
        setPaymentMethod1('Dinheiro');
        setAmount1('');
        setPaymentMethod2('Cartão');
        setAmount2('');
    }, []);

    useEffect(() => {
        if (isOpen) {
            if (transaction) {
                setDesc(transaction.description);
                setAmount(String(transaction.amount));
                setDate(new Date(transaction.date).toISOString().split('T')[0]);
                setType(transaction.type);

                if (transaction.type === TransactionType.Income && transaction.paymentMethods?.length > 1) {
                    setIsSplit(true);
                    setPaymentMethod1(transaction.paymentMethods[0].method);
                    setAmount1(String(transaction.paymentMethods[0].amount));
                    setPaymentMethod2(transaction.paymentMethods[1].method);
                    setAmount2(String(transaction.paymentMethods[1].amount));
                } else {
                    setIsSplit(false);
                    setPaymentMethod(transaction.paymentMethods?.[0]?.method || 'Dinheiro');
                }
            } else {
                resetForm();
            }
        }
    }, [transaction, isOpen, resetForm]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const numAmount = parseFloat(amount);
        if (!desc || isNaN(numAmount) || !date || numAmount <= 0) {
            showAlert("Por favor, preencha todos os campos corretamente. O valor deve ser positivo.");
            return;
        }

        let paymentMethods: PaymentMethod[] = [];
        if (type === TransactionType.Income) {
            if (isSplit) {
                const numAmount1 = parseFloat(amount1);
                const numAmount2 = parseFloat(amount2);
                if (isNaN(numAmount1) || isNaN(numAmount2) || numAmount1 <= 0 || numAmount2 <= 0) {
                    showAlert("Os valores da divisão devem ser preenchidos e maiores que zero.");
                    return;
                }
                if (Math.abs((numAmount1 + numAmount2) - numAmount) > 0.001) {
                     showAlert(`A soma dos pagamentos (${formatCurrency(numAmount1 + numAmount2)}) não corresponde ao valor total da transação (${formatCurrency(numAmount)}).`);
                     return;
                }
                paymentMethods = [
                    { method: paymentMethod1, amount: numAmount1 },
                    { method: paymentMethod2, amount: numAmount2 }
                ];
            } else {
                paymentMethods = [{ method: paymentMethod, amount: numAmount }];
            }
        }
        
        const txData = {
            description: desc.trim().toUpperCase(),
            amount: numAmount,
            type,
            date: new Date(date + 'T00:00:00Z').toISOString(), // Ensure UTC date
            paymentMethods
        };
        
        try {
            if (transaction) {
                await updateTransaction({ ...txData, id: transaction.id });
                showAlert('Transação atualizada com sucesso!');
            } else {
                await addTransaction(txData);
                showAlert('Transação adicionada com sucesso!');
            }
            onClose();
        } catch (error) {
            showAlert('Falha ao salvar a transação.');
            console.error("Transaction save error: ", error);
        }
    };
    
    const inputClasses = "w-full bg-neutral-800 border border-neutral-700 rounded-lg p-2.5 text-neutral-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition";

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={transaction ? 'Editar Transação' : 'Nova Transação'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="description" className="block text-sm font-medium text-neutral-300 mb-1">Descrição</label>
                    <input type="text" id="description" value={desc} onChange={e => setDesc(e.target.value)} required className={inputClasses} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="amount" className="block text-sm font-medium text-neutral-300 mb-1">Valor (R$)</label>
                        <input type="number" id="amount" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} required className={inputClasses} />
                    </div>
                    <div>
                        <label htmlFor="date" className="block text-sm font-medium text-neutral-300 mb-1">Data</label>
                        <input type="date" id="date" value={date} onChange={e => setDate(e.target.value)} required className={`${inputClasses} [color-scheme:dark]`} />
                    </div>
                </div>
                <div>
                    <label htmlFor="type" className="block text-sm font-medium text-neutral-300 mb-1">Tipo</label>
                    <select id="type" value={type} onChange={e => setType(e.target.value as TransactionType)} className={inputClasses}>
                        <option value={TransactionType.Expense}>Saída</option>
                        <option value={TransactionType.Income}>Entrada</option>
                    </select>
                </div>
                {type === TransactionType.Income && (
                    <div className="space-y-4 pt-4 mt-4 border-t border-neutral-800">
                        <div className="flex items-center">
                            <input id="split-payment-checkbox" type="checkbox" checked={isSplit} onChange={e => setIsSplit(e.target.checked)} className="h-4 w-4 rounded border-neutral-300 bg-neutral-700 text-blue-600 focus:ring-blue-500"/>
                            <label htmlFor="split-payment-checkbox" className="ml-3 block text-sm text-neutral-300">Dividir Pagamento</label>
                        </div>
                        {isSplit ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-in">
                                <div>
                                    <label className="block text-xs font-medium text-neutral-400">Pagamento 1</label>
                                    <select value={paymentMethod1} onChange={e => setPaymentMethod1(e.target.value)} className={`${inputClasses} mt-1`}>
                                        <option>Dinheiro</option><option>Cartão</option><option>PIX</option><option>Boleto</option><option>Depósito</option>
                                    </select>
                                    <input type="number" step="0.01" placeholder="Valor 1" value={amount1} onChange={e => setAmount1(e.target.value)} required className={`${inputClasses} mt-2`} />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-neutral-400">Pagamento 2</label>
                                    <select value={paymentMethod2} onChange={e => setPaymentMethod2(e.target.value)} className={`${inputClasses} mt-1`}>
                                        <option>Dinheiro</option><option>Cartão</option><option>PIX</option><option>Boleto</option><option>Depósito</option>
                                    </select>
                                    <input type="number" step="0.01" placeholder="Valor 2" value={amount2} onChange={e => setAmount2(e.target.value)} required className={`${inputClasses} mt-2`} />
                                </div>
                            </div>
                        ) : (
                            <div>
                                <label htmlFor="paymentMethod" className="block text-sm font-medium text-neutral-300 mb-1">Forma de Pagamento</label>
                                <select id="paymentMethod" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className={inputClasses}>
                                    <option>Dinheiro</option><option>Cartão</option><option>PIX</option><option>Boleto</option><option>Depósito</option>
                                </select>
                            </div>
                        )}
                    </div>
                )}
                <Button type="submit" className="w-full !mt-8">Salvar</Button>
            </form>
        </Modal>
    );
};


const GeminiModal = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
    const { addMultipleTransactions, showAlert } = useAppContext();
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputText.trim()) {
            showAlert("Por favor, insira um texto para a IA processar.");
            return;
        }
        setIsLoading(true);
        try {
            const results = await generateTransactionsFromText(inputText);
            if (results && results.length > 0) {
                await addMultipleTransactions(results);
                showAlert(`${results.length} transações criadas com sucesso!`);
                setInputText('');
                onClose();
            } else {
                showAlert('A IA não retornou transações válidas.');
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : "Ocorreu um erro desconhecido.";
            showAlert(message);
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Criar Transações com IA">
             <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="gemini-input" className="block text-sm font-medium text-neutral-300 mb-1">Cole ou descreva suas transações</label>
                    <textarea id="gemini-input" rows={8} value={inputText} onChange={e => setInputText(e.target.value)}
                        className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-2.5 text-neutral-200 focus:ring-2 focus:ring-blue-500 transition"
                        placeholder="Ex:&#10;MERCADO 30,00&#10;MANGUEIRA 80,00&#10;MOTO BOY 40,00"></textarea>
                </div>
                <Button type="submit" disabled={isLoading} className="w-full from-purple-600 to-fuchsia-500 hover:from-purple-500 hover:to-fuchsia-500 shadow-purple-500/20 hover:shadow-purple-500/40">
                    {isLoading ? <SpinnerIcon /> : <MagicIcon />}
                    <span>Criar Transações</span>
                </Button>
            </form>
        </Modal>
    );
};

const DetailsModal = ({ isOpen, onClose, title, transactions }: { isOpen: boolean, onClose: () => void, title: string, transactions: Transaction[] }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    useEffect(() => {
        if (isOpen && transactions.length > 0) {
            const dates = transactions.map(tx => new Date(tx.date).getTime());
            setStartDate(new Date(Math.min(...dates)).toISOString().split('T')[0]);
            setEndDate(new Date(Math.max(...dates)).toISOString().split('T')[0]);
        } else if (!isOpen) {
            setSearchTerm('');
            setStartDate('');
            setEndDate('');
        }
    }, [isOpen, transactions]);

    const filteredTransactions = useMemo(() => {
        if (!isOpen) return [];
        return transactions.filter(tx => {
            const txDate = new Date(tx.date);
            const start = startDate ? new Date(startDate) : null;
            const end = endDate ? new Date(endDate) : null;
            if (start) start.setUTCHours(0, 0, 0, 0);
            if (end) end.setUTCHours(23, 59, 59, 999);

            const matchesSearch = tx.description.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesDate = (!start || txDate >= start) && (!end || txDate <= end);

            return matchesSearch && matchesDate;
        });
    }, [transactions, searchTerm, startDate, endDate, isOpen]);

    const inputClasses = "w-full bg-neutral-800 border border-neutral-700 rounded-lg p-2.5 text-neutral-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition";

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title} size="4xl">
            <div className="flex flex-col h-full">
                 <div className="flex-shrink-0 grid grid-cols-1 md:grid-cols-2 gap-4 pb-4 border-b border-neutral-800">
                    <div>
                        <label htmlFor="details-search" className="block text-sm font-medium text-neutral-300 mb-1">Buscar por Descrição</label>
                        <input
                            type="text"
                            id="details-search"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className={inputClasses}
                            placeholder="Filtrar por nome..."
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-neutral-300 mb-1">Filtrar por Período</label>
                        <div className="flex gap-2">
                            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={`${inputClasses} [color-scheme:dark]`} />
                            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className={`${inputClasses} [color-scheme:dark]`} />
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto mt-4">
                    <table className="w-full text-left">
                        <thead className="sticky top-0 bg-neutral-900/80 backdrop-blur-sm z-10">
                            <tr className="border-b-2 border-neutral-700">
                                <th className="p-3 font-semibold text-neutral-400 text-sm">Descrição</th>
                                {transactions[0]?.type === TransactionType.Income && <th className="p-3 font-semibold text-neutral-400 text-sm">Pagamento</th>}
                                <th className="p-3 font-semibold text-neutral-400 text-sm">Data</th>
                                <th className="p-3 font-semibold text-neutral-400 text-sm text-right">Valor</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredTransactions.length > 0 ? filteredTransactions.map((tx, index) => (
                                <tr key={tx.id} className="border-b border-neutral-800/70 animate-fade-in-up" style={{ animationDelay: `${index * 20}ms` }}>
                                    <td className="p-3 font-medium text-neutral-200">{tx.description}</td>
                                    {tx.type === TransactionType.Income && <td className="p-3 text-neutral-400">{tx.paymentMethods.map(p => p.method).join(' / ')}</td>}
                                    <td className="p-3 text-neutral-400">{formatDate(tx.date)}</td>
                                    <td className={`p-3 text-right font-bold ${tx.type === 'income' ? 'text-green-400' : 'text-red-400'}`}>
                                        {formatCurrency(tx.amount)}
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={transactions[0]?.type === TransactionType.Income ? 4 : 3} className="text-center py-20 text-neutral-500">
                                        <p className="font-medium">Nenhuma transação encontrada.</p>
                                        <p className="text-sm">Tente ajustar os filtros.</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </Modal>
    );
};

const AlertModal = ({ message, onClose }: { message: string, onClose: () => void }) => (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
        <div className="bg-neutral-900 border border-neutral-700 rounded-2xl w-full max-w-sm text-center p-8 shadow-2xl animate-fade-in-up">
            <p className="text-neutral-300 mb-6 text-lg">{message}</p>
            <Button onClick={onClose} className="mx-auto px-10">OK</Button>
        </div>
    </div>
);


// --- AUTH PAGE ---
const AuthPage = () => {
    const { showAlert } = useAppContext();
    const [isRegister, setIsRegister] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    
    const inputClasses = "w-full bg-neutral-800/80 border border-neutral-700 rounded-lg p-3.5 text-neutral-200 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition";
    
    const getFirebaseErrorMessage = (errorCode: string) => {
        switch (errorCode) {
            case 'auth/user-not-found':
            case 'auth/wrong-password':
                return 'Email ou senha incorretos.';
            case 'auth/email-already-in-use':
                return 'Este email já está em uso por outra conta.';
            case 'auth/weak-password':
                return 'A senha deve ter pelo menos 6 caracteres.';
            case 'auth/invalid-email':
                return 'O formato do email é inválido.';
            default:
                return 'Ocorreu um erro. Tente novamente.';
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isRegister && password !== confirmPassword) {
            showAlert("As senhas não coincidem.");
            return;
        }
        setIsLoading(true);
        try {
            if (isRegister) {
                await createUserWithEmailAndPassword(auth, email, password);
                showAlert("Conta criada com sucesso! Você já pode fazer o login.");
                setIsRegister(false); // Switch to login view
            } else {
                await signInWithEmailAndPassword(auth, email, password);
                // Auth state change will handle the redirect
            }
        } catch (error: any) {
            showAlert(getFirebaseErrorMessage(error.code));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-neutral-950 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(30,64,175,0.3),rgba(255,255,255,0))] px-4">
            <div className="w-full max-w-4xl mx-auto bg-neutral-900/60 backdrop-blur-xl border border-neutral-800 rounded-2xl shadow-2xl flex flex-col md:flex-row overflow-hidden">
                <div className="hidden md:flex flex-col justify-center items-center w-full md:w-1/2 bg-gradient-to-br from-blue-700 to-indigo-800 p-12 text-white text-center">
                    <div className="animate-fade-in-up">
                        <WalletIcon className="w-24 h-24 mb-6 text-blue-300" />
                        <h1 className="text-4xl font-bold mb-2">Finanças</h1>
                        <p className="text-blue-200">Seu painel financeiro, simples e eficiente.</p>
                    </div>
                </div>
                <div className="w-full md:w-1/2 p-8 md:p-12">
                    <form onSubmit={handleSubmit} className="animate-fade-in">
                        {isRegister ? (
                            <>
                                <h2 className="text-3xl font-bold text-center mb-2 text-white">Crie sua Conta</h2>
                                <p className="text-center text-neutral-400 mb-8">É rápido e fácil.</p>
                                <div className="space-y-4">
                                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" required className={inputClasses} />
                                    <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Senha (mín. 6 caracteres)" required className={inputClasses} />
                                    <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Confirmar Senha" required className={inputClasses} />
                                    <Button type="submit" className="w-full !mt-6" disabled={isLoading}>{isLoading ? <SpinnerIcon /> : 'Registrar'}</Button>
                                </div>
                                <p className="text-center text-sm text-neutral-400 mt-6">Já tem uma conta? <a href="#" onClick={(e) => { e.preventDefault(); setIsRegister(false); }} className="font-semibold text-blue-400 hover:text-blue-300">Entrar</a></p>
                            </>
                        ) : (
                            <>
                                <h2 className="text-3xl font-bold text-center mb-2 text-white">Bem-vindo!</h2>
                                <p className="text-center text-neutral-400 mb-8">Faça login para continuar.</p>
                                <div className="space-y-4">
                                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" required className={inputClasses} />
                                    <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Senha" required className={inputClasses} />
                                    <Button type="submit" className="w-full !mt-6" disabled={isLoading}>{isLoading ? <SpinnerIcon /> : 'Entrar'}</Button>
                                </div>
                                <p className="text-center text-sm text-neutral-400 mt-6">Não tem uma conta? <a href="#" onClick={(e) => { e.preventDefault(); setIsRegister(true); }} className="font-semibold text-blue-400 hover:text-blue-300">Registre-se</a></p>
                            </>
                        )}
                    </form>
                </div>
            </div>
        </div>
    );
};


// --- MAIN APP COMPONENT ---
export default function App() {
    const [user, setUser] = useState<User | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [presets, setPresets] = useState<Preset[]>([]);
    const [page, setPage] = useState<Page>(Page.Dashboard);
    const [alertInfo, setAlertInfo] = useState<{ message: string } | null>(null);
    const [serviceOrderHistory, setServiceOrderHistory] = useState<string[]>([]);
    const [isLoadingApp, setIsLoadingApp] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
            if (firebaseUser) {
                setUser({ email: firebaseUser.email!, uid: firebaseUser.uid });
            } else {
                setUser(null);
            }
            setIsLoadingApp(false);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (!user?.uid) {
            setTransactions([]);
            setPresets([]);
            setServiceOrderHistory([]);
            return;
        }

        // Transactions listener
        const txQuery = query(collection(db, "users", user.uid, "transactions"), orderBy("date", "desc"));
        const unsubscribeTx = onSnapshot(txQuery, (snapshot) => {
            const txsFromDb = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    // Convert Firestore Timestamp to ISO string if necessary
                    date: data.date instanceof Timestamp ? data.date.toDate().toISOString() : data.date,
                } as Transaction;
            });
            setTransactions(txsFromDb);
        });
        
        // Service Order History listener
        const soQuery = query(collection(db, "users", user.uid, "serviceOrders"), orderBy("createdAt", "desc"), limit(5));
        const unsubscribeSO = onSnapshot(soQuery, (snapshot) => {
            const historyFromDb = snapshot.docs.map(doc => doc.data().content as string);
            setServiceOrderHistory(historyFromDb);
        });

        return () => {
            unsubscribeTx();
            unsubscribeSO();
        };
    }, [user]);

    const addTransaction = async (txData: Omit<Transaction, 'id'>) => {
        if (!user) throw new Error("User not authenticated");
        const collectionRef = collection(db, 'users', user.uid, 'transactions');
        await addDoc(collectionRef, txData);
    };

    const updateTransaction = async (tx: Transaction) => {
        if (!user) throw new Error("User not authenticated");
        const docRef = doc(db, 'users', user.uid, 'transactions', tx.id);
        const { id, ...txData } = tx;
        await updateDoc(docRef, txData);
    };
    
    const deleteTransaction = async (id: string) => {
        if (!user) throw new Error("User not authenticated");
        const docRef = doc(db, 'users', user.uid, 'transactions', id);
        await deleteDoc(docRef);
    };
    
    const addMultipleTransactions = async (txs: GeminiTransaction[]) => {
        if (!user) throw new Error("User not authenticated");
        const batch = writeBatch(db);
        const collectionRef = collection(db, 'users', user.uid, 'transactions');
        txs.forEach(item => {
            const docRef = doc(collectionRef);
            const txData = {
                description: item.description.toUpperCase(),
                amount: item.amount,
                type: item.type,
                date: new Date().toISOString(),
                paymentMethods: item.paymentMethod ? [{ method: item.paymentMethod, amount: item.amount }] : []
            };
            batch.set(docRef, txData);
        });
        await batch.commit();
    };
    
    const addServiceOrderToHistory = async (order: string) => {
        if (!user) throw new Error("User not authenticated");
        const collectionRef = collection(db, 'users', user.uid, 'serviceOrders');
        await addDoc(collectionRef, {
            content: order,
            createdAt: serverTimestamp()
        });
    };

    const showAlert = (message: string) => setAlertInfo({ message });

    const contextValue: AppContextType = {
        user,
        transactions,
        presets,
        page,
        serviceOrderHistory,
        setPage,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        addMultipleTransactions,
        addServiceOrderToHistory,
        showAlert,
    };

    const PageComponent = {
        [Page.Dashboard]: DashboardPage,
        [Page.Transactions]: TransactionsPage,
        [Page.Reports]: ReportsPage,
        [Page.ServiceOrder]: ServiceOrderPage,
        [Page.Settings]: SettingsPage,
    }[page];
    
    if (isLoadingApp) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-neutral-950">
                <SpinnerIcon className="w-10 h-10 text-blue-500" />
            </div>
        );
    }
    
    if (!user) {
        return <AppContext.Provider value={contextValue}><AuthPage /></AppContext.Provider>;
    }

    return (
        <AppContext.Provider value={contextValue}>
            <div className="flex h-screen text-neutral-200 bg-neutral-950">
                <Sidebar />
                <div className="flex-1 flex flex-col overflow-hidden">
                    <Header />
                    <div className="flex-1 overflow-y-auto bg-neutral-950 animate-fade-in">
                       <PageComponent />
                    </div>
                </div>
            </div>
            {alertInfo && <AlertModal message={alertInfo.message} onClose={() => setAlertInfo(null)} />}
        </AppContext.Provider>
    );
}