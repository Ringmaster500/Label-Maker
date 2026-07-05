import { useState, useEffect } from 'react';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import LabelWizard from './components/LabelWizard';
import { SavedDesign, UserSession, LabelState } from './types';
import { AlertCircle, HelpCircle } from 'lucide-react';

export default function App() {
  const [session, setSession] = useState<UserSession | null>(null);
  const [view, setView] = useState<'login' | 'dashboard' | 'wizard'>('login');
  const [savedDesigns, setSavedDesigns] = useState<SavedDesign[]>([]);
  const [activeDesign, setActiveDesign] = useState<SavedDesign | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);

  // Custom modal dialog system
  const [modal, setModal] = useState<{
    type: 'alert' | 'confirm';
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel?: () => void;
  } | null>(null);

  const showAlert = (title: string, message: string) => {
    return new Promise<void>((resolve) => {
      setModal({
        type: 'alert',
        title,
        message,
        onConfirm: () => {
          setModal(null);
          resolve();
        }
      });
    });
  };

  const showConfirm = (title: string, message: string) => {
    return new Promise<boolean>((resolve) => {
      setModal({
        type: 'confirm',
        title,
        message,
        onConfirm: () => {
          setModal(null);
          resolve(true);
        },
        onCancel: () => {
          setModal(null);
          resolve(false);
        }
      });
    });
  };

  // Check auth session status on boot
  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await fetch('/api/auth/session');
        const data = await response.json() as { authenticated: boolean; user?: { email: string } };

        if (response.ok && data.authenticated && data.user) {
          // Token is read from cookies by backend automatically, 
          // we initialize the frontend session object.
          const userSession: UserSession = {
            email: data.user.email,
            token: '' // Token resides securely in HttpOnly cookie
          };
          setSession(userSession);
          await loadDesigns(userSession);
          setView('dashboard');
        } else {
          setView('login');
        }
      } catch (err) {
        console.error('Failed to authenticate session:', err);
        setView('login');
      } finally {
        setCheckingSession(false);
      }
    };

    checkSession();
  }, []);

  // Retrieve templates list from API
  const loadDesigns = async (currentSession: UserSession = session!) => {
    if (!currentSession) return;
    try {
      const response = await fetch('/api/templates', {
        headers: {
          'Authorization': `Bearer ${currentSession.token}`
        }
      });
      if (response.ok) {
        const designs = await response.json() as SavedDesign[];
        setSavedDesigns(designs.sort((a: SavedDesign, b: SavedDesign) => b.updatedAt.localeCompare(a.updatedAt)));
      }
    } catch (err) {
      console.error('Failed to load designs from cloud:', err);
    }
  };

  const handleLoginSuccess = async (newSession: UserSession) => {
    setSession(newSession);
    await loadDesigns(newSession);
    setView('dashboard');
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error('Logout request failed:', err);
    } finally {
      setSession(null);
      setSavedDesigns([]);
      setActiveDesign(null);
      setView('login');
    }
  };

  // Create or Update template
  const handleSaveDesign = async (
    name: string, 
    isTemplateBase: boolean, 
    state: Omit<LabelState, 'viewMode' | 'showSafetyZone'>,
    saveAsNew: boolean = false
  ) => {
    if (!session) return;
    
    const isEditing = !!activeDesign && !saveAsNew;
    const endpoint = '/api/templates';
    const method = isEditing ? 'PUT' : 'POST';

    const payload = isEditing ? {
      id: activeDesign.id,
      name,
      isTemplateBase,
      templateId: state.templateId,
      state
    } : {
      name,
      isTemplateBase,
      templateId: state.templateId,
      state
    };

    const response = await fetch(endpoint, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.token}`
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json() as { error?: string };

    if (!response.ok) {
      throw new Error(data.error || 'Failed to save design.');
    }

    await loadDesigns();
    setActiveDesign(null);
    setView('dashboard');
  };

  const handleDeleteDesign = async (id: string) => {
    if (!session) return;
    try {
      const response = await fetch(`/api/templates?id=${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.token}`
        }
      });

      if (response.ok) {
        await loadDesigns();
      } else {
        const data = await response.json() as { error?: string };
        showAlert('Deletion Failed', data.error || 'Unknown error');
      }
    } catch (err: any) {
      showAlert('Network Error', 'Network error during deletion: ' + err.message);
    }
  };

  const handleDuplicateDesign = async (design: SavedDesign) => {
    if (!session) return;
    try {
      const response = await fetch('/api/templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.token}`
        },
        body: JSON.stringify({
          name: `${design.name} (Copy)`,
          isTemplateBase: design.isTemplateBase,
          templateId: design.templateId,
          state: design.state
        })
      });

      if (response.ok) {
        await loadDesigns();
      } else {
        const data = await response.json() as { error?: string };
        showAlert('Duplication Failed', data.error || 'Unknown error');
      }
    } catch (err: any) {
      showAlert('Network Error', 'Network error during duplication: ' + err.message);
    }
  };

  const handleLoadDesign = (design: SavedDesign) => {
    setActiveDesign(design);
    setView('wizard');
  };

  const handleNewDesign = () => {
    setActiveDesign(null);
    setView('wizard');
  };

  // Rendering Loader screen
  if (checkingSession) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center space-y-4">
          <svg className="animate-spin h-10 w-10 text-[#dfa283] mx-auto" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="text-xs text-[#dfa283] font-medium tracking-wide">Syncing cloud workspace credentials...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {view === 'login' && (
        <Login onLoginSuccess={handleLoginSuccess} />
      )}
      {view === 'dashboard' && session && (
        <Dashboard
          session={session}
          savedDesigns={savedDesigns}
          onLogout={handleLogout}
          onNewDesign={handleNewDesign}
          onLoadDesign={handleLoadDesign}
          onDeleteDesign={handleDeleteDesign}
          onDuplicateDesign={handleDuplicateDesign}
          showConfirm={showConfirm}
        />
      )}
      {view === 'wizard' && session && (
        <LabelWizard
          activeDesign={activeDesign}
          onSave={handleSaveDesign}
          onBackToDashboard={() => {
            setActiveDesign(null);
            setView('dashboard');
          }}
          token={session.token}
          showAlert={showAlert}
        />
      )}

      {/* Custom Alert/Confirm Modal Dialog */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-[#3c2f2f]/35 backdrop-blur-xs transition-opacity" 
            onClick={modal.type === 'alert' ? modal.onConfirm : modal.onCancel}
          />
          
          {/* Modal Container */}
          <div className="bg-white border border-[#e2d6c9] rounded-2xl max-w-sm w-full p-6 shadow-2xl relative overflow-hidden transform scale-100 transition-all space-y-4">
            {/* Top accent line */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#dfa283] to-[#e5bda7]" />
            
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl shrink-0 bg-[#dfa283]/10 text-[#dfa283] border border-[#dfa283]/20">
                {modal.type === 'confirm' ? (
                  <HelpCircle className="w-5 h-5" />
                ) : (
                  <AlertCircle className="w-5 h-5" />
                )}
              </div>
              <div className="space-y-1 flex-1">
                <h3 className="text-sm font-bold text-[#3c2f2f]">{modal.title}</h3>
                <p className="text-xs text-[#6d5c5a] leading-relaxed">{modal.message}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              {modal.type === 'confirm' && (
                <button
                  onClick={modal.onCancel}
                  className="flex-1 py-2 px-3 rounded-xl bg-white hover:bg-[#faf6f2] border border-[#e2d6c9] text-xs font-bold text-[#6d5c5a] transition-all cursor-pointer text-center"
                >
                  Cancel
                </button>
              )}
              <button
                onClick={modal.onConfirm}
                className="flex-1 py-2 px-3 rounded-xl bg-[#dfa283] hover:bg-[#d48e6c] text-white text-xs font-bold transition-all cursor-pointer text-center"
              >
                {modal.type === 'confirm' ? 'Confirm' : 'OK'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}


