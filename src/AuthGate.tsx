import React, { useEffect, useState } from 'react';
import { useContent } from './context/ContentContext';
import { FarewellScreen } from './components/FarewellScreen';
import { LoginScreen } from './components/LoginScreen';
import { AuthUser, fetchMe, logoutUser, saveUserProfile } from './lib/userAuth';
const JourneyApp = React.lazy(() => import('./journey/JourneyApp').then((m) => ({ default: m.JourneyApp })));
import { STORAGE_KEY, adoptLegacyData, userStorageKey } from './lib/storage';

/** What the gate passes to the app. Without `user` the app runs in the original name-only mode. */
export interface AppShellProps {
  storageKey: string;
  user?: AuthUser;
  /** Ends the session; rejects (and keeps the user signed in) if the server could not be reached. */
  onLogout?: (name: string) => Promise<void>;
  onSaveProfile?: (firstName: string, lastName: string) => Promise<void>;
}

type AuthState =
  | { status: 'checking' }
  | { status: 'error'; message: string }
  | { status: 'out' }
  | { status: 'farewell'; name: string }
  | { status: 'in'; user: AuthUser };

const Splash: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <div className="flex min-h-screen items-center justify-center bg-canvas p-4 text-center text-sm font-medium text-ink-2">
    {children ?? 'در حال بارگذاری...'}
  </div>
);

/**
 * Decides which entrance the visitor gets. With phone sign-in off (the
 * default) the app starts as before. With it on, an SMS-verified session is
 * required. The choice is made once per page load so that a settings change
 * never swaps the screen under someone who is mid-session.
 */
export const AuthGate: React.FC<{ AppComponent: React.ComponentType<AppShellProps> }> = ({ AppComponent }) => {
  const { content, isReady } = useContent();
  const [mode, setMode] = useState<null | 'legacy' | 'phone'>(null);
  const [auth, setAuth] = useState<AuthState>({ status: 'checking' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (isReady && mode === null) setMode(
        (content.site.phoneLoginEnabled === true || content.site.passwordLoginEnabled === true) &&
          content.site.openAccess !== true
          ? 'phone'
          : 'legacy'
      );
  }, [isReady, mode, content.site.phoneLoginEnabled, content.site.passwordLoginEnabled, content.site.openAccess]);

  useEffect(() => {
    if (mode !== 'phone') return;
    let cancelled = false;
    setAuth({ status: 'checking' });
    fetchMe()
      .then((me) => {
        if (cancelled) return;
        if (me) {
          adoptLegacyData(me.id);
          setAuth({ status: 'in', user: me });
        } else {
          setAuth({ status: 'out' });
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) setAuth({ status: 'error', message: err instanceof Error ? err.message : 'خطای ناشناخته' });
      });
    return () => {
      cancelled = true;
    };
  }, [mode, attempt]);

  if (mode === null) return <Splash />;
  if (mode === 'legacy') return <AppComponent storageKey={STORAGE_KEY} />;

  switch (auth.status) {
    case 'checking':
      return <Splash />;
    case 'error':
      return (
        <Splash>
          <div className="max-w-sm space-y-4">
            <p>{auth.message}</p>
            <button
              onClick={() => setAttempt((n) => n + 1)}
              className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-surface hover:bg-primary-hover"
            >
              تلاش دوباره
            </button>
          </div>
        </Splash>
      );
    case 'out':
      return (
        <LoginScreen
          brandName={content.site.brandName}
          orgName={content.site.orgName}
          smsEnabled={content.site.phoneLoginEnabled === true}
          passwordEnabled={content.site.passwordLoginEnabled === true}
          onDone={(user) => {
            adoptLegacyData(user.id);
            setAuth({ status: 'in', user });
          }}
        />
      );
    case 'farewell':
      return (
        <FarewellScreen
          name={auth.name}
          text={content.site.farewellText}
          buttonLabel="ورود دوباره"
          onContinue={() => setAuth({ status: 'out' })}
        />
      );
    case 'in': {
      const { user } = auth;
      // While the trip game is on, members of a trip group see only the game.
      if (content.site.tripMode === true && user.tripGroup) {
        return (
          <React.Suspense fallback={<Splash />}>
            <JourneyApp
              key={user.id}
              user={user}
              onLogout={async (name) => {
                await logoutUser();
                setAuth({ status: 'farewell', name });
              }}
            />
          </React.Suspense>
        );
      }
      return (
        <AppComponent
          key={user.id}
          storageKey={userStorageKey(user.id)}
          user={user}
          onLogout={async (name) => {
            await logoutUser();
            setAuth({ status: 'farewell', name });
          }}
          onSaveProfile={async (firstName, lastName) => {
            const updated = await saveUserProfile(firstName, lastName);
            setAuth({ status: 'in', user: updated });
          }}
        />
      );
    }
  }
};
