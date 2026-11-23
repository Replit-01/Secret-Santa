import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import {
  ArrowLeft, ArrowRight, Check, CheckCircle2, Copy, Gift, KeyRound, LogIn,
  LogOut, PartyPopper, RefreshCw, ShieldCheck, Sparkles, Trash2, UserRound, Users,
} from 'lucide-react';
import {
  getGetCurrentUserQueryKey, getGetHealthQueryKey, getGetMyAssignmentQueryKey, getGetProfileQueryKey,
  getGetRoomQueryKey, getListAdminRoomsQueryKey, useCreateRoom, useDeleteRoom,
  useDeleteRoomMember, useDrawRoom,
  useGetCurrentUser, useGetHealth, useGetMyAssignment, useGetProfile, useGetRoom,
  useJoinRoom, useListAdminRooms, useLoginUser, useLogoutUser, useRegisterUser,
  useResetRoomDraw, useUpdateWishlist,
} from '@workspace/api-client-react';
import {
  Link, Route, Router as WouterRouter, Switch, useLocation, useParams,
} from 'wouter';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
});

function errorCopy() {
  return 'Coś poszło nie tak. Spróbuj ponownie za chwilę.';
}

function isUnauthorized(error: unknown) {
  return Boolean(error && typeof error === 'object' && 'status' in error && (error as { status?: number }).status === 401);
}

function PageFrame({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <main className={`content-wrap page-in ${className}`}>{children}</main>;
}

function TopNav() {
  const [location, setLocation] = useLocation();
  const { data: session } = useGetCurrentUser();
  const logout = useLogoutUser();
  const queryClient = useQueryClient();
  const user = session?.user;
  const onLogout = () => logout.mutate(undefined, {
    onSuccess: () => {
      queryClient.setQueryData(getGetCurrentUserQueryKey(), undefined);
      void queryClient.invalidateQueries({ queryKey: getGetCurrentUserQueryKey() });
      setLocation('/');
    },
  });
  return (
    <header className="content-wrap topbar">
      <Link href="/" className="brand" data-testid="link-home">
        <span className="brand-mark"><Gift size={18} strokeWidth={2.2} /></span>
        <span>Podaruj<span style={{ color: 'hsl(var(--accent))' }}> dalej</span></span>
      </Link>
      <nav className="nav-links" aria-label="Nawigacja główna">
        {user ? (
          <>
            <Link href="/profile" className={`nav-link nav-hide-mobile ${location === '/profile' ? 'active' : ''}`} data-testid="link-profile">Moje wymiany</Link>
            {user.isAdmin && <Link href="/admin" className={`nav-link nav-hide-mobile ${location === '/admin' ? 'active' : ''}`} data-testid="link-admin">Panel organizatora</Link>}
            <span className="nav-link" style={{ color: 'hsl(var(--foreground))' }}>{user.username}</span>
            <button className="nav-button nav-hide-mobile" onClick={onLogout} disabled={logout.isPending} data-testid="button-logout">
              <LogOut size={15} style={{ verticalAlign: 'middle', marginRight: 5 }} /> Wyloguj
            </button>
          </>
        ) : (
          <>
            <Link href="/login" className="nav-link nav-hide-mobile" data-testid="link-login">Zaloguj się</Link>
            <Link href="/register" className="button button-primary" style={{ padding: '10px 14px' }} data-testid="link-register">Załóż konto <ArrowRight size={14} /></Link>
          </>
        )}
      </nav>
    </header>
  );
}

function AppShell() {
  const [location] = useLocation();
  useGetHealth({ query: { queryKey: getGetHealthQueryKey(), staleTime: 60_000 } });
  return (
    <div className="app-shell">
      <TopNav />
      <Switch>
        <Route path="/" component={HomePage} />
        <Route path="/login" component={LoginPage} />
        <Route path="/register" component={RegisterPage} />
        <Route path="/profile" component={ProfilePage} />
        <Route path="/room/:code" component={RoomPage} />
        <Route path="/admin" component={AdminPage} />
        <Route component={NotFoundPage} />
      </Switch>
      <footer className="content-wrap" style={{ padding: '26px 0 32px', color: 'hsl(var(--muted-foreground))', fontSize: 11, display: 'flex', justifyContent: 'space-between', gap: 12 }}>
        <span>Małe gesty zostają na długo.</span>
        <span className="ornament" aria-hidden="true">✳ · ✳ · ✳</span>
      </footer>
      {location !== '/login' && location !== '/register' && <MobileLinks />}
    </div>
  );
}

function MobileLinks() {
  const { data } = useGetCurrentUser();
  if (!data?.user) return null;
  return (
    <nav className="content-wrap mobile-nav" aria-label="Nawigacja mobilna">
      <Link href="/profile" className="nav-link" data-testid="mobile-link-profile">Wymiany</Link>
      {data.user.isAdmin && <Link href="/admin" className="nav-link" data-testid="mobile-link-admin">Organizator</Link>}
    </nav>
  );
}

const ROOM_CODE_PATTERN = /^[A-HJ-NP-Z2-9]{6}$/i;

function authContinuation() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code')?.trim().toUpperCase();
  if (code && ROOM_CODE_PATTERN.test(code)) {
    return {
      destination: `/room/${encodeURIComponent(code)}`,
      query: `?code=${encodeURIComponent(code)}`,
    };
  }

  const next = params.get('next');
  const roomPath = next?.match(/^\/room\/([A-HJ-NP-Z2-9]{6})$/i);
  if (roomPath) {
    const destination = `/room/${roomPath[1].toUpperCase()}`;
    return {
      destination,
      query: `?next=${encodeURIComponent(destination)}`,
    };
  }

  return { destination: '/profile', query: '' };
}

function HomePage() {
  const [code, setCode] = useState('');
  const [, setLocation] = useLocation();
  const { data: session, isLoading } = useGetCurrentUser();
  const join = (event: FormEvent) => {
    event.preventDefault();
    const normalized = code.trim().toUpperCase();
    if (!normalized) return;
    if (session?.user) {
      setLocation(`/room/${encodeURIComponent(normalized)}`);
    } else {
      setLocation(`/login?code=${encodeURIComponent(normalized)}`);
    }
  };
  return (
    <PageFrame>
      <section style={{ display: 'grid', gridTemplateColumns: '1.15fr .85fr', gap: 60, alignItems: 'center', padding: '82px 0 66px' }} className="home-hero">
        <div>
          <div className="kicker" style={{ marginBottom: 19 }}><span className="ornament" style={{ marginRight: 10 }}>✳</span> Wspólna radość, bez zgadywania</div>
          <h1 className="heading" style={{ fontSize: 'clamp(47px, 7.3vw, 86px)', margin: 0, maxWidth: 680 }}>
            Prezent, który<br /><em style={{ color: 'hsl(var(--accent))' }}>trafia w serce.</em>
          </h1>
          <p style={{ maxWidth: 445, color: 'hsl(var(--muted-foreground))', fontSize: 16, lineHeight: 1.75, margin: '23px 0 30px' }}>
            Zbierz bliskich przy jednym stole, rozlosuj imiona i podaruj sobie odrobinę świątecznej tajemnicy.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            {session?.user ? (
              <Link href="/profile" className="button button-primary" data-testid="button-my-exchanges">Przejdź do wymian <ArrowRight size={16} /></Link>
            ) : (
              <Link href="/register" className="button button-primary" data-testid="button-create-account">Zacznij od konta <ArrowRight size={16} /></Link>
            )}
            <span style={{ color: 'hsl(var(--muted-foreground))', fontSize: 11 }}>{isLoading ? 'Sprawdzamy sesję…' : 'Bez pośpiechu. Bez karteczek.'}</span>
          </div>
          <form onSubmit={join} className="panel" style={{ display: 'flex', gap: 8, padding: 8, maxWidth: 460, marginTop: 42 }}>
            <label className="sr-only" htmlFor="join-code">Kod wymiany</label>
            <input id="join-code" className="input" style={{ border: 0, background: 'transparent', boxShadow: 'none' }} value={code} onChange={e => setCode(e.target.value)} placeholder="Masz kod zaproszenia?" data-testid="input-join-code" />
            <button type="submit" className="button button-secondary" disabled={!code.trim()} data-testid="button-join-code">Dołącz <ArrowRight size={15} /></button>
          </form>
        </div>
        <div className="hero-art" aria-label="Ilustracja świątecznej paczki">
          <div className="art-orbit orbit-one" /><div className="art-orbit orbit-two" />
          <div className="art-sun" />
          <div className="gift-box">
            <div className="gift-top" /><div className="gift-ribbon" /><div className="gift-bow bow-left" /><div className="gift-bow bow-right" />
            <div className="gift-seal"><Sparkles size={23} /></div>
          </div>
          <div className="art-note note-a">dla Ciebie</div><div className="art-note note-b">z serca</div>
          <div className="art-spark s1">✦</div><div className="art-spark s2">✧</div><div className="art-spark s3">✦</div>
        </div>
      </section>
      <section style={{ borderTop: '1px solid hsl(var(--border))', padding: '27px 0 50px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 22 }} className="how-grid">
        {[
          ['01', 'Zaproś swoich', 'Podaj kod rodzinie lub przyjaciołom. Każdy dopisze się do wspólnej listy.'],
          ['02', 'Wylosuj imię', 'Losowanie przydziela każdej osobie jednego obdarowanego. Tajemnica zostaje tajemnicą.'],
          ['03', 'Podaruj radość', 'Zajrzyj na listę życzeń i znajdź coś, co wywoła prawdziwy uśmiech.'],
        ].map(([num, title, text]) => <article key={num} style={{ padding: '15px 7px' }}>
          <div className="kicker" style={{ marginBottom: 12 }}>Krok {num}</div>
          <h2 className="heading" style={{ fontSize: 23, margin: '0 0 9px' }}>{title}</h2>
          <p style={{ fontSize: 13, lineHeight: 1.7, color: 'hsl(var(--muted-foreground))', margin: 0 }}>{text}</p>
        </article>)}
      </section>
      <section className="closing-band">
        <div><div className="kicker">Sekretne Mikołajki</div><h2 className="heading" style={{ fontSize: 36, margin: '10px 0 0' }}>Najlepsze prezenty zaczynają się od uważności.</h2></div>
        <Gift size={39} strokeWidth={1.2} />
      </section>
      <style>{`
        .home-hero { grid-template-columns:1.15fr .85fr; }
        .hero-art { position:relative; min-height:390px; border-radius:48% 52% 47% 53%; background:radial-gradient(circle at 50% 48%, hsl(42 61% 90%), hsl(39 43% 93%) 55%, transparent 70%); display:grid; place-items:center; }
        .art-orbit { position:absolute; border:1px solid hsl(153 24% 49% / .2); border-radius:50%; transform:rotate(-27deg); }
        .orbit-one { width:330px;height:220px; }.orbit-two { width:250px;height:340px;transform:rotate(32deg); }
        .art-sun { position:absolute;width:175px;height:175px;border-radius:50%;background:hsl(8 60% 85% / .66);top:63px;right:54px; }
        .gift-box { width:206px;height:174px;position:relative;margin-top:65px; background:hsl(153 31% 28%);border-radius:8px 8px 15px 15px;box-shadow:0 27px 42px hsl(153 30% 25% / .2); transform:rotate(-5deg); }
        .gift-top { position:absolute;left:-13px;right:-13px;top:-19px;height:39px;border-radius:8px;background:hsl(153 35% 34%); }
        .gift-ribbon { position:absolute;left:85px;top:-19px;bottom:0;width:35px;background:hsl(8 55% 57%); }
        .gift-bow { position:absolute;top:-49px;width:47px;height:41px;border:11px solid hsl(8 55% 57%);border-radius:80% 15% 70% 20%; }
        .bow-left { left:67px;transform:rotate(15deg); }.bow-right { left:105px;transform:scaleX(-1) rotate(15deg); }
        .gift-seal { position:absolute;top:66px;left:78px;width:52px;height:52px;display:grid;place-items:center;color:hsl(42 40% 96%);border-radius:50%;background:hsl(8 55% 57%); }
        .art-note { position:absolute;font-family:var(--app-font-serif);font-style:italic;color:hsl(var(--primary));font-size:18px; }
        .note-a { left:24px;top:92px;transform:rotate(-12deg); }.note-b { right:14px;bottom:63px;transform:rotate(9deg); }
        .art-spark { position:absolute;color:hsl(var(--accent));font-size:20px; }.s1 { top:80px;left:87px; }.s2 { bottom:94px;left:62px;font-size:27px; }.s3 { right:70px;top:189px; }
        .closing-band { display:flex;align-items:center;justify-content:space-between;padding:30px 35px;margin:16px 0 46px;border-radius:18px;background:hsl(153 26% 21%);color:hsl(42 40% 96%); }
        .closing-band .heading { color:hsl(42 40% 96%);max-width:680px; }
        @media(max-width:700px) { .home-hero { grid-template-columns:1fr!important;gap:5px!important;padding:50px 0 30px!important; } .hero-art { min-height:300px;order:-1; transform:scale(.9); margin:-25px -15px -8px; } .how-grid { grid-template-columns:1fr!important;gap:4px!important;padding-top:10px!important; } .closing-band { padding:24px 21px;gap:18px; }.closing-band .heading { font-size:27px!important; } }
      `}</style>
    </PageFrame>
  );
}

function AuthLayout({ children, mode }: { children: ReactNode; mode: 'login' | 'register' }) {
  return (
    <PageFrame>
      <div style={{ minHeight: 'calc(100dvh - 160px)', display: 'grid', gridTemplateColumns: '1fr 1fr', alignItems: 'center', gap: 70, padding: '42px 0' }} className="auth-grid">
        <div>
          <div className="kicker" style={{ marginBottom: 16 }}>Wspólne świętowanie</div>
          <h1 className="heading" style={{ fontSize: 'clamp(43px, 5.5vw, 67px)', margin: 0 }}>{mode === 'login' ? <>Dobrze Cię<br /><em>znów widzieć.</em></> : <>Zróbmy miejsce<br /><em>na radość.</em></>}</h1>
          <p style={{ color: 'hsl(var(--muted-foreground))', lineHeight: 1.75, maxWidth: 370, marginTop: 20 }}>
            {mode === 'login' ? 'Zaloguj się, aby sprawdzić, komu w tym roku sprawisz niespodziankę.' : 'Załóż konto i dołącz do wymiany prezentów, która zaczyna się od dobrych intencji.'}
          </p>
          <div className="ornament" style={{ marginTop: 38 }}>✳ &nbsp; ✳ &nbsp; ✳</div>
        </div>
        <div className="panel" style={{ padding: 'clamp(24px, 5vw, 42px)' }}>{children}</div>
      </div>
      <style>{`@media(max-width:700px){.auth-grid{grid-template-columns:1fr!important;gap:20px!important;padding:32px 0!important;min-height:auto!important}.auth-grid .ornament{display:none}}`}</style>
    </PageFrame>
  );
}

function LoginPage() {
  const continuation = authContinuation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const login = useLoginUser();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const submit = (event: FormEvent) => {
    event.preventDefault(); setError('');
    login.mutate({ data: { username, password } }, {
      onSuccess: result => {
        queryClient.setQueryData(getGetCurrentUserQueryKey(), result);
        void queryClient.invalidateQueries({ queryKey: getGetProfileQueryKey() });
        setLocation(continuation.destination);
      },
      onError: () => setError('Nie udało się zalogować. Sprawdź nazwę użytkownika i hasło.'),
    });
  };
  return <AuthLayout mode="login">
    <div className="kicker">Witamy z powrotem</div>
    <h2 className="heading" style={{ fontSize: 32, margin: '8px 0 24px' }}>Zaloguj się</h2>
    <form onSubmit={submit} style={{ display: 'grid', gap: 18 }}>
      <div><label className="label" htmlFor="username">Nazwa użytkownika</label><input id="username" className="input" autoComplete="username" value={username} onChange={e => setUsername(e.target.value)} required data-testid="input-username" /></div>
      <div><label className="label" htmlFor="password">Hasło</label><input id="password" className="input" type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required data-testid="input-password" /></div>
      {error && <div className="error-box" role="alert">{error}</div>}
      <button className="button button-primary" disabled={login.isPending} type="submit" data-testid="button-login">
        {login.isPending ? 'Logowanie…' : 'Zaloguj się'} {login.isPending ? <RefreshCw size={15} className="spin" /> : <LogIn size={15} />}
      </button>
    </form>
    <p style={{ margin: '20px 0 0', color: 'hsl(var(--muted-foreground))', fontSize: 12, textAlign: 'center' }}>
      Nie masz konta? <Link href={`/register${continuation.query}`} style={{ color: 'hsl(var(--primary))', fontWeight: 700 }} data-testid="link-register-from-login">Utwórz je</Link>
    </p>
    <p style={{ borderTop: '1px solid hsl(var(--border))', paddingTop: 17, marginTop: 22, fontSize: 11, color: 'hsl(var(--muted-foreground))', textAlign: 'center' }}>
      Konto organizatora: <strong>admin / admin</strong>
    </p>
  </AuthLayout>;
}

function RegisterPage() {
  const continuation = authContinuation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const register = useRegisterUser();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const submit = (event: FormEvent) => {
    event.preventDefault(); setError('');
    register.mutate({ data: { username, password } }, {
      onSuccess: result => {
        queryClient.setQueryData(getGetCurrentUserQueryKey(), result);
        setLocation(continuation.destination);
      },
      onError: () => setError('Nie udało się utworzyć konta. Sprawdź nazwę i spróbuj ponownie.'),
    });
  };
  return <AuthLayout mode="register">
    <div className="kicker">Własne miejsce w kręgu</div>
    <h2 className="heading" style={{ fontSize: 32, margin: '8px 0 24px' }}>Załóż konto</h2>
    <form onSubmit={submit} style={{ display: 'grid', gap: 18 }}>
      <div><label className="label" htmlFor="new-username">Nazwa użytkownika</label><input id="new-username" className="input" autoComplete="username" minLength={3} maxLength={24} pattern="[A-Za-z0-9_.-]+" value={username} onChange={e => setUsername(e.target.value)} required data-testid="input-register-username" /><small style={{ display: 'block', color: 'hsl(var(--muted-foreground))', marginTop: 6, fontSize: 11 }}>3–24 znaki: litery, cyfry, kropka, myślnik lub podkreślenie.</small></div>
      <div><label className="label" htmlFor="new-password">Hasło</label><input id="new-password" className="input" type="password" autoComplete="new-password" minLength={8} maxLength={128} value={password} onChange={e => setPassword(e.target.value)} required data-testid="input-register-password" /><small style={{ display: 'block', color: 'hsl(var(--muted-foreground))', marginTop: 6, fontSize: 11 }}>Co najmniej 8 znaków.</small></div>
      {error && <div className="error-box" role="alert">{error}</div>}
      <button className="button button-primary" disabled={register.isPending} type="submit" data-testid="button-register">{register.isPending ? 'Tworzenie konta…' : 'Utwórz konto'} <ArrowRight size={15} /></button>
    </form>
    <p style={{ margin: '20px 0 0', color: 'hsl(var(--muted-foreground))', fontSize: 12, textAlign: 'center' }}>
      Masz już konto? <Link href={`/login${continuation.query}`} style={{ color: 'hsl(var(--primary))', fontWeight: 700 }} data-testid="link-login-from-register">Zaloguj się</Link>
    </p>
  </AuthLayout>;
}

function LoadingPanel({ title = 'Ładujemy Twoją przestrzeń…' }: { title?: string }) {
  return <PageFrame><div className="panel" style={{ padding: 28, marginTop: 50 }} aria-label={title}><div className="skeleton" style={{ height: 18, width: 150, marginBottom: 20 }} /><div className="skeleton" style={{ height: 38, width: '58%', marginBottom: 25 }} /><div className="skeleton" style={{ height: 90 }} /></div></PageFrame>;
}

function SignedOut({ action = 'zobaczyć tę stronę', returnTo }: { action?: string; returnTo?: string }) {
  const loginHref = returnTo ? `/login?next=${encodeURIComponent(returnTo)}` : '/login';
  return <PageFrame><section className="panel" style={{ maxWidth: 570, padding: '45px 38px', margin: '75px auto', textAlign: 'center' }}>
    <div className="brand-mark" style={{ margin: '0 auto 20px' }}><KeyRound size={17} /></div>
    <div className="kicker">Twoje konto</div><h1 className="heading" style={{ fontSize: 37, margin: '10px 0' }}>Jeszcze chwila.</h1>
    <p style={{ color: 'hsl(var(--muted-foreground))', lineHeight: 1.65, margin: '0 auto 23px' }}>Zaloguj się, aby {action}.</p>
    <Link href={loginHref} className="button button-primary" data-testid="button-sign-in-required">Zaloguj się <ArrowRight size={15} /></Link>
  </section></PageFrame>;
}

function ProfilePage() {
  const { data: profile, isLoading, isError, error, refetch } = useGetProfile();
  const { data: session, isLoading: sessionLoading } = useGetCurrentUser();
  if (isLoading || sessionLoading) return <LoadingPanel />;
  if (isError && isUnauthorized(error)) return <SignedOut action="zobaczyć swoje wymiany" />;
  if (isError) return <PageFrame><ErrorState retry={() => void refetch()} /></PageFrame>;
  if (!profile) return <SignedOut action="zobaczyć swoje wymiany" />;
  return <PageFrame>
    <div style={{ padding: '54px 0 25px' }}>
      <div className="kicker">Twoje miejsce w kręgu</div>
      <div style={{ display: 'flex', alignItems: 'end', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap', marginTop: 9 }}>
        <div><h1 className="heading" style={{ fontSize: 50, margin: 0 }}>Cześć, {profile.user.username}.</h1><p style={{ color: 'hsl(var(--muted-foreground))', margin: '10px 0 0' }}>Oto wymiany, w których bierzesz udział.</p></div>
        <div className="profile-stamp"><UserRound size={18} /> Uczestnik wymiany</div>
      </div>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 22, paddingBottom: 60 }} className="profile-grid">
      <section className="panel" style={{ padding: '24px 27px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}><h2 className="heading" style={{ fontSize: 25, margin: 0 }}>Moje wymiany</h2><span className="kicker">{profile.rooms.length} {profile.rooms.length === 1 ? 'wymiana' : 'wymian'}</span></div>
        {profile.rooms.length === 0 ? <EmptyState title="Tu zaczyna się niespodzianka" text="Nie dołączyłeś jeszcze do żadnej wymiany. Wpisz kod zaproszenia, aby znaleźć się wśród uczestników." action={<Link href="/" className="button button-primary" data-testid="button-find-exchange">Znajdź wymianę <ArrowRight size={15} /></Link>} /> :
          profile.rooms.map(room => <Link href={`/room/${encodeURIComponent(room.code)}`} key={room.code} className="profile-room" data-testid={`card-profile-room-${room.code}`}>
            <span className="room-symbol"><Gift size={19} /></span>
            <span style={{ flex: 1, minWidth: 0 }}><strong style={{ display: 'block', color: 'hsl(var(--foreground))', fontSize: 15 }}>{room.name}</strong><small style={{ color: 'hsl(var(--muted-foreground))', display: 'block', marginTop: 4 }}>Kod: {room.code} · {room.memberCount} uczestników</small></span>
            <StatusPill status={room.status} /><ArrowRight size={16} color="hsl(var(--muted-foreground))" />
          </Link>)}
      </section>
      <aside className="profile-aside">
        <div className="kicker">Pamiętaj</div><p className="heading" style={{ fontSize: 25, lineHeight: 1.22, margin: '11px 0 15px' }}>Najlepsza lista życzeń mówi o tym, co naprawdę cieszy.</p>
        <p style={{ color: 'hsl(var(--muted-foreground))', fontSize: 12, lineHeight: 1.7, margin: 0 }}>W każdej wymianie możesz ją uzupełnić lub zmienić — także po losowaniu.</p>
        <div className="aside-rule" />
        <Link href="/" className="nav-link" style={{ color: 'hsl(var(--primary))' }} data-testid="link-join-another">Dołącz do kolejnej <ArrowRight size={14} /></Link>
      </aside>
    </div>
    <style>{`.profile-room{display:flex;align-items:center;gap:14px;text-decoration:none;border-top:1px solid hsl(var(--border));padding:17px 0}.profile-room:hover{transform:translateX(3px)}.room-symbol{height:42px;width:42px;display:grid;place-items:center;border-radius:13px;background:hsl(40 42% 89%);color:hsl(var(--primary))}.profile-aside{border-radius:20px;padding:25px 23px;background:hsl(40 48% 91%)}.aside-rule{height:1px;background:hsl(37 28% 80%);margin:23px 0 15px}.profile-stamp{display:flex;align-items:center;gap:8px;color:hsl(var(--primary));border:1px solid hsl(var(--border));background:hsl(var(--card));border-radius:30px;padding:10px 14px;font-size:11px;font-weight:700}@media(max-width:700px){.profile-grid{grid-template-columns:1fr!important}.profile-aside{display:none}}`}</style>
  </PageFrame>;
}

function StatusPill({ status }: { status: string }) {
  const drawn = status === 'drawn';
  return <span className={`status-pill ${drawn ? 'drawn' : ''}`} data-testid={`status-${drawn ? 'drawn' : 'open'}`}><span className="status-dot" />{drawn ? 'Wylosowano' : 'Zapisy trwają'}</span>;
}

function EmptyState({ title, text, action }: { title: string; text: string; action?: ReactNode }) {
  return <div style={{ textAlign: 'center', padding: '46px 12px 35px' }}>
    <div className="empty-mark"><Gift size={24} strokeWidth={1.5} /></div>
    <h3 className="heading" style={{ fontSize: 24, margin: '16px 0 7px' }}>{title}</h3>
    <p style={{ maxWidth: 380, margin: '0 auto 20px', color: 'hsl(var(--muted-foreground))', fontSize: 13, lineHeight: 1.65 }}>{text}</p>
    {action}
    <style>{`.empty-mark{width:54px;height:54px;border-radius:17px 17px 17px 5px;margin:auto;background:hsl(8 45% 93%);color:hsl(var(--accent));display:grid;place-items:center}`}</style>
  </div>;
}

function ErrorState({ retry }: { retry: () => void }) {
  return <section className="panel" style={{ padding: 38, margin: '60px auto', maxWidth: 550, textAlign: 'center' }}>
    <div className="kicker">Chwila przerwy</div><h2 className="heading" style={{ fontSize: 30, margin: '10px 0' }}>Nie możemy teraz wczytać danych.</h2>
    <p style={{ color: 'hsl(var(--muted-foreground))', marginBottom: 22 }}>{errorCopy()}</p><button className="button button-primary" onClick={retry} data-testid="button-retry"><RefreshCw size={15} /> Spróbuj ponownie</button>
  </section>;
}

function RoomPage() {
  const params = useParams<{ code: string }>();
  const code = params.code ?? '';
  const { data: room, isLoading, isError, error, refetch } = useGetRoom(code, { query: { queryKey: getGetRoomQueryKey(code), enabled: Boolean(code) } });
  const { data: session } = useGetCurrentUser();
  const join = useJoinRoom();
  const save = useUpdateWishlist();
  const queryClient = useQueryClient();
  const [wishlist, setWishlist] = useState('');
  const [savedMessage, setSavedMessage] = useState('');
  const initialized = useRef('');
  const { data: assignment, isLoading: assignmentLoading, isError: assignmentError } = useGetMyAssignment(code, {
    query: { queryKey: getGetMyAssignmentQueryKey(code), enabled: Boolean(code && room?.isMember && room.room.status === 'drawn') },
  });
  useEffect(() => {
    if (room && initialized.current !== code) {
      initialized.current = code;
      setWishlist(room.myWishlist || '');
    }
  }, [room, code]);
  const refreshRoom = () => {
    void queryClient.invalidateQueries({ queryKey: getGetRoomQueryKey(code) });
    void queryClient.invalidateQueries({ queryKey: getGetProfileQueryKey() });
    void queryClient.invalidateQueries({ queryKey: getGetMyAssignmentQueryKey(code) });
  };
  const onJoin = () => join.mutate({ roomCode: code }, { onSuccess: refreshRoom });
  const onSave = (event: FormEvent) => {
    event.preventDefault(); setSavedMessage('');
    save.mutate({ roomCode: code, data: { text: wishlist } }, {
      onSuccess: () => { setSavedMessage('Lista życzeń została zapisana.'); refreshRoom(); },
      onError: () => setSavedMessage('Nie udało się zapisać listy. Spróbuj ponownie.'),
    });
  };
  if (isLoading) return <LoadingPanel title="Wczytujemy wymianę…" />;
  if (isError && isUnauthorized(error)) return <SignedOut action="otworzyć tę wymianę" returnTo={`/room/${encodeURIComponent(code)}`} />;
  if (isError || !room) return <PageFrame><ErrorState retry={() => void refetch()} /></PageFrame>;
  const drawn = room.room.status === 'drawn';
  return <PageFrame>
    <div style={{ padding: '39px 0 22px' }}>
      <Link href={session?.user ? '/profile' : '/'} className="nav-link" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }} data-testid="link-back"><ArrowLeft size={14} /> Wróć</Link>
      <div className="room-heading">
        <div><div className="kicker" style={{ marginTop: 19 }}>Wymiana prezentów · kod {room.room.code}</div><h1 className="heading" style={{ fontSize: 'clamp(39px, 6vw, 61px)', margin: '8px 0 12px' }}>{room.room.name}</h1><div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}><StatusPill status={room.room.status} /><span style={{ color: 'hsl(var(--muted-foreground))', fontSize: 12 }}><Users size={14} style={{ verticalAlign: 'middle', marginRight: 5 }} />{room.room.memberCount} uczestników</span></div></div>
        <InviteCode code={room.room.code} />
      </div>
    </div>
    {!session?.user && <div className="error-box" style={{ marginBottom: 20, background: 'hsl(40 54% 92%)', color: 'hsl(var(--foreground))', borderColor: 'hsl(var(--border))' }}>Zaloguj się, aby dołączyć do tej wymiany i zapisać swoją listę życzeń. <Link href="/login" style={{ color: 'hsl(var(--primary))', fontWeight: 700 }}>Zaloguj się</Link></div>}
    <div className="room-layout">
      <div style={{ display: 'grid', gap: 20, alignContent: 'start' }}>
        {!room.isMember && session?.user && <section className="join-card">
          <div><div className="kicker">Jesteś zaproszony</div><h2 className="heading" style={{ margin: '8px 0', fontSize: 25 }}>Dołącz do losowania</h2><p style={{ margin: 0, fontSize: 12, color: 'hsl(var(--muted-foreground))' }}>Po dołączeniu przygotujesz własną listę życzeń.</p></div>
          <button className="button button-primary" onClick={onJoin} disabled={join.isPending || drawn} data-testid="button-join-room">{join.isPending ? 'Dołączanie…' : 'Dołączam'} <ArrowRight size={15} /></button>
          {drawn && <small>Losowanie już się odbyło — zapisy do tej wymiany są zamknięte.</small>}
        </section>}
        {room.isMember && <section className="panel" style={{ padding: '25px 27px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 15, alignItems: 'start' }}>
            <div><div className="kicker">Tylko dla Ciebie</div><h2 className="heading" style={{ fontSize: 27, margin: '7px 0' }}>Twoja lista życzeń</h2></div>
            <span className="wish-count">{wishlist.length}/3000</span>
          </div>
          <p style={{ color: 'hsl(var(--muted-foreground))', fontSize: 12, lineHeight: 1.65, margin: '0 0 18px' }}>Podpowiedz Mikołajowi, co sprawi Ci radość. Możesz edytować listę także po losowaniu.</p>
          <form onSubmit={onSave}>
            <label className="sr-only" htmlFor="wishlist-text">Lista życzeń</label>
            <textarea id="wishlist-text" className="textarea" maxLength={3000} value={wishlist} onChange={e => setWishlist(e.target.value)} placeholder={'Co lubisz? Jaki kolor nosisz? Może książka, herbata albo wspólne wyjście…'} data-testid="textarea-wishlist" />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginTop: 14 }}>
              <span aria-live="polite" style={{ color: savedMessage.includes('Nie udało') ? 'hsl(var(--destructive))' : 'hsl(var(--muted-foreground))', fontSize: 11 }}>{savedMessage}</span>
              <button type="submit" className="button button-primary" disabled={save.isPending || wishlist.length > 3000} data-testid="button-save-wishlist">{save.isPending ? 'Zapisywanie…' : 'Zapisz listę'} {savedMessage.startsWith('Lista') ? <Check size={15} /> : <ArrowRight size={15} />}</button>
            </div>
          </form>
        </section>}
        {room.isMember && drawn && <section className="gift-reveal">
          <div className="reveal-stamp"><Sparkles size={18} /></div><div className="kicker">Twoja tajemnica</div>
          <h2 className="heading" style={{ fontSize: 27, margin: '8px 0 5px' }}>Podarujesz prezent dla…</h2>
          {assignmentLoading ? <div className="skeleton" style={{ height: 37, width: 190, marginTop: 15 }} /> : assignment ?
            <><p className="recipient-name">{assignment.recipient.username}</p><div className="recipient-wish"><div className="kicker" style={{ marginBottom: 8 }}>Lista życzeń tej osoby</div>{assignment.wishlist.text ? <p style={{ whiteSpace: 'pre-wrap', margin: 0, lineHeight: 1.7 }}>{assignment.wishlist.text}</p> : <span style={{ color: 'hsl(var(--muted-foreground))' }}>Ta osoba jeszcze nie dodała listy życzeń.</span>}</div></> :
            <p style={{ color: 'hsl(var(--muted-foreground))', fontSize: 13 }}>{assignmentError ? 'Nie udało się wczytać Twojego przydziału. Odśwież stronę, aby spróbować ponownie.' : 'Przydział pojawi się tutaj po losowaniu.'}</p>}
          <p style={{ margin: '15px 0 0', color: 'hsl(var(--muted-foreground))', fontSize: 11 }}>To jedyny przydział widoczny na Twoim koncie.</p>
        </section>}
      </div>
      <aside className="panel participant-panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 14 }}>
          <div><div className="kicker">Razem raźniej</div><h2 className="heading" style={{ fontSize: 22, margin: '6px 0 0' }}>Uczestnicy</h2></div>
          <span className="member-count">{room.members.length}</span>
        </div>
        {room.members.length ? room.members.map(member => <div className="member-row" key={member.id} data-testid={`member-${member.id}`}>
          <span className="member-avatar">{member.username.slice(0, 1).toUpperCase()}</span>
          <span style={{ flex: 1, minWidth: 0 }}><strong style={{ display: 'block', fontSize: 12 }}>{member.username}</strong><small style={{ color: 'hsl(var(--muted-foreground))', fontSize: 10 }}>Uczestnik wymiany</small></span>
          {member.hasWishlist && <CheckCircle2 size={15} color="hsl(var(--primary))" aria-label="Lista życzeń gotowa" />}
        </div>) : <p style={{ color: 'hsl(var(--muted-foreground))', fontSize: 12 }}>Jeszcze nikt nie dołączył.</p>}
        <div className="participant-note"><ShieldCheck size={16} /><span>Każdy widzi wyłącznie własny przydział.</span></div>
      </aside>
    </div>
    <style>{`
      .room-heading{display:flex;align-items:center;justify-content:space-between;gap:24px}.room-layout{display:grid;grid-template-columns:minmax(0,1fr) 320px;gap:21px;padding-bottom:54px}
      .invite-card{min-width:195px;background:hsl(40 46% 91%);border-radius:16px;padding:17px 18px}.invite-code{font-family:var(--app-font-sans);font-weight:700;letter-spacing:.12em;font-size:19px;color:hsl(var(--primary))}
      .join-card{display:flex;align-items:center;justify-content:space-between;gap:18px;padding:22px 25px;border-radius:18px;background:hsl(153 25% 22%);color:hsl(42 40% 96%);flex-wrap:wrap}.join-card .heading{color:hsl(42 40% 96%)}.join-card .kicker{color:hsl(8 68% 75%)}.join-card p{color:hsl(42 30% 78%)!important}.join-card small{width:100%;color:hsl(42 30% 78%)}
      .wish-count{color:hsl(var(--muted-foreground));font-size:11px;font-variant-numeric:tabular-nums}.participant-panel{padding:22px 23px;align-self:start}.member-count{display:grid;place-items:center;width:29px;height:29px;border-radius:50%;background:hsl(40 42% 89%);color:hsl(var(--primary));font-size:12px;font-weight:800}
      .member-row{display:flex;align-items:center;gap:11px;padding:12px 0;border-top:1px solid hsl(var(--border) / .75)}.member-avatar{width:32px;height:32px;border-radius:11px 11px 11px 4px;background:hsl(8 44% 92%);display:grid;place-items:center;color:hsl(var(--accent));font-weight:800;font-size:12px}
      .participant-note{display:flex;gap:9px;align-items:center;padding:12px;margin-top:15px;background:hsl(149 25% 92%);color:hsl(var(--primary));font-size:10px;line-height:1.45;border-radius:11px}.gift-reveal{padding:24px 27px;border:1px solid hsl(8 36% 84%);border-radius:20px;background:linear-gradient(140deg,hsl(8 48% 96%),hsl(40 50% 94%));position:relative;overflow:hidden}.reveal-stamp{position:absolute;right:20px;top:18px;width:38px;height:38px;border-radius:50%;background:hsl(8 47% 90%);color:hsl(var(--accent));display:grid;place-items:center}.recipient-name{font:600 32px var(--app-font-serif);color:hsl(var(--accent));margin:9px 0 18px}.recipient-wish{border-top:1px solid hsl(8 33% 84%);padding-top:15px;font-size:13px}
      @media(max-width:800px){.room-layout{grid-template-columns:1fr}.participant-panel{order:-1}.room-heading{align-items:flex-start;flex-direction:column}.invite-card{width:100%;box-sizing:border-box;display:flex;justify-content:space-between;align-items:center}}
    `}</style>
  </PageFrame>;
}

function InviteCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(code); setCopied(true); window.setTimeout(() => setCopied(false), 1800); } catch { setCopied(false); }
  };
  return <div className="invite-card">
    <span><span className="kicker" style={{ display: 'block', marginBottom: 6 }}>Kod zaproszenia</span><span className="invite-code">{code}</span></span>
    <button onClick={copy} className="button button-secondary" style={{ padding: '9px 11px', fontSize: 11 }} data-testid="button-copy-code">{copied ? <Check size={14} /> : <Copy size={14} />}{copied ? 'Skopiowano' : 'Kopiuj kod'}</button>
  </div>;
}

function AdminPage() {
  const { data: session, isLoading: sessionLoading } = useGetCurrentUser();
  const admin = Boolean(session?.user.isAdmin);
  const { data, isLoading, isError, refetch } = useListAdminRooms({ query: { queryKey: getListAdminRoomsQueryKey(), enabled: admin } });
  const create = useCreateRoom();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [formError, setFormError] = useState('');
  if (sessionLoading) return <LoadingPanel />;
  if (!session?.user) return <SignedOut action="otworzyć panel organizatora" />;
  if (!admin) return <PageFrame><section className="panel" style={{ maxWidth: 560, margin: '70px auto', padding: 34, textAlign: 'center' }}><ShieldCheck size={27} color="hsl(var(--accent))" /><h1 className="heading" style={{ fontSize: 32 }}>To miejsce dla organizatora.</h1><p style={{ color: 'hsl(var(--muted-foreground))' }}>To konto nie ma uprawnień do zarządzania wymianami.</p><Link href="/profile" className="button button-primary" data-testid="button-profile-from-admin">Moje wymiany <ArrowRight size={15} /></Link></section></PageFrame>;
  const submit = (event: FormEvent) => {
    event.preventDefault(); setFormError('');
    create.mutate({ data: { name: name.trim() } }, {
      onSuccess: () => { setName(''); void queryClient.invalidateQueries({ queryKey: getListAdminRoomsQueryKey() }); },
      onError: () => setFormError('Nie udało się utworzyć wymiany. Sprawdź nazwę i spróbuj ponownie.'),
    });
  };
  return <PageFrame>
    <div style={{ padding: '52px 0 27px' }}>
      <div className="kicker">Pracownia organizatora</div>
      <div className="admin-title"><div><h1 className="heading" style={{ fontSize: 50, margin: '8px 0 9px' }}>Niech zacznie się magia.</h1><p style={{ color: 'hsl(var(--muted-foreground))', margin: 0 }}>Przygotuj wymianę i zadbaj o to, by nikt nie został bez prezentu.</p></div><div className="admin-mark"><PartyPopper size={25} /></div></div>
    </div>
    <section className="create-bar panel">
      <div><div className="kicker">Nowa wymiana</div><h2 className="heading" style={{ fontSize: 23, margin: '6px 0 0' }}>Zaproś bliskich do zabawy.</h2></div>
      <form onSubmit={submit} className="create-form"><label className="sr-only" htmlFor="room-name">Nazwa wymiany</label><input id="room-name" className="input" placeholder="np. Święta u babci" maxLength={80} value={name} onChange={e => setName(e.target.value)} required data-testid="input-room-name" /><button className="button button-primary" type="submit" disabled={!name.trim() || create.isPending} data-testid="button-create-room">{create.isPending ? 'Tworzenie…' : 'Utwórz wymianę'} <ArrowRight size={15} /></button></form>
      {formError && <div className="error-box" style={{ gridColumn: '1 / -1' }}>{formError}</div>}
    </section>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', margin: '37px 0 15px', gap: 12 }}><div><div className="kicker">Wszystkie wymiany</div><h2 className="heading" style={{ fontSize: 29, margin: '6px 0 0' }}>Przegląd losowań</h2></div><button onClick={() => void refetch()} className="button button-quiet" style={{ padding: '9px 12px' }} data-testid="button-refresh-admin"><RefreshCw size={14} /> Odśwież</button></div>
    {isLoading ? <div className="panel" style={{ padding: 25 }}><div className="skeleton" style={{ height: 120 }} /></div> : isError ? <ErrorState retry={() => void refetch()} /> : !data?.rooms.length ? <section className="panel"><EmptyState title="Jeszcze nie ma wymian" text="Utwórz pierwszą wymianę. Otrzymasz kod, którym zaprosisz uczestników." /></section> :
      <div style={{ display: 'grid', gap: 14, paddingBottom: 55 }}>{data.rooms.map(room => <AdminRoomCard key={room.code} room={room} />)}</div>}
    <style>{`.admin-title{display:flex;align-items:center;justify-content:space-between;gap:20px}.admin-mark{width:63px;height:63px;border-radius:21px 21px 21px 6px;background:hsl(8 47% 92%);color:hsl(var(--accent));display:grid;place-items:center}.create-bar{padding:22px 25px;display:grid;grid-template-columns:1fr 1.3fr;align-items:center;gap:15px}.create-form{display:flex;gap:8px}.create-form .input{min-width:0}.create-form .button{white-space:nowrap}@media(max-width:700px){.admin-title{align-items:flex-start}.admin-mark{display:none}.create-bar{grid-template-columns:1fr}.create-form{flex-direction:column}.create-form .button{width:100%}}`}</style>
  </PageFrame>;
}

function AdminRoomCard({ room }: { room: { code: string; name: string; status: string; memberCount: number; wishlistCount: number; createdAt: string } }) {
  const { data: detail, isLoading, isError } = useGetRoom(room.code, { query: { queryKey: getGetRoomQueryKey(room.code) } });
  const draw = useDrawRoom();
  const reset = useResetRoomDraw();
  const removeRoom = useDeleteRoom();
  const removeMember = useDeleteRoomMember();
  const queryClient = useQueryClient();
  const [notice, setNotice] = useState('');
  const done = room.status === 'drawn';
  const completion = room.memberCount ? Math.round((room.wishlistCount / room.memberCount) * 100) : 0;
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: getListAdminRoomsQueryKey() });
    void queryClient.invalidateQueries({ queryKey: getGetRoomQueryKey(room.code) });
    void queryClient.invalidateQueries({ queryKey: getGetProfileQueryKey() });
  };
  const onDraw = () => {
    if (window.confirm(`Rozpocząć losowanie dla „${room.name}”?`)) draw.mutate({ roomCode: room.code }, { onSuccess: refresh, onError: () => setNotice('Nie udało się przeprowadzić losowania. Sprawdź, czy wszyscy mogą wziąć udział.') });
  };
  const onReset = () => {
    if (window.confirm(`Unieważnić losowanie dla „${room.name}”? Uczestnicy i ich listy życzeń pozostaną bez zmian.`)) reset.mutate({ roomCode: room.code }, { onSuccess: refresh, onError: () => setNotice('Nie udało się zresetować losowania.') });
  };
  const onDeleteRoom = () => {
    if (window.confirm(`Usunąć wymianę „${room.name}” wraz z uczestnikami, listami życzeń i losowaniem? Konta użytkowników pozostaną bez zmian.`)) {
      removeRoom.mutate({ roomCode: room.code }, {
        onSuccess: () => {
          void queryClient.removeQueries({ queryKey: getGetRoomQueryKey(room.code) });
          void queryClient.invalidateQueries({ queryKey: getListAdminRoomsQueryKey() });
          void queryClient.invalidateQueries({ queryKey: getGetProfileQueryKey() });
        },
        onError: () => setNotice('Nie udało się usunąć wymiany.'),
      });
    }
  };
  const onDeleteMember = (userId: number, username: string) => {
    if (window.confirm(`Usunąć ${username} z wymiany „${room.name}”? Lista życzeń tej osoby w tej wymianie zostanie usunięta.`)) {
      removeMember.mutate({ roomCode: room.code, userId }, {
        onSuccess: refresh,
        onError: () => setNotice('Nie udało się usunąć uczestnika z wymiany.'),
      });
    }
  };
  return <article className="admin-room panel" data-testid={`admin-room-${room.code}`}>
    <div className="admin-room-top">
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
        <span className="room-symbol"><Gift size={19} /></span><div style={{ minWidth: 0 }}><h3 className="heading" style={{ fontSize: 21, margin: '0 0 5px' }}>{room.name}</h3><span style={{ color: 'hsl(var(--muted-foreground))', fontSize: 10 }}>Kod <strong style={{ color: 'hsl(var(--primary))', letterSpacing: '.1em' }}>{room.code}</strong> · utworzono {formatDate(room.createdAt)}</span></div>
      </div>
      <StatusPill status={room.status} />
    </div>
    <div className="admin-metrics">
      <div><span className="kicker">Uczestnicy</span><strong>{room.memberCount}</strong></div>
      <div><span className="kicker">Listy życzeń</span><strong>{room.wishlistCount}<small> / {room.memberCount}</small></strong></div>
      <div className="completion"><div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginBottom: 7 }}><span>Gotowość</span><strong>{completion}%</strong></div><div className="progress-track"><span style={{ width: `${completion}%` }} /></div></div>
      <div className="admin-actions">{done ?
        <button className="button button-danger" disabled={reset.isPending || removeRoom.isPending} onClick={onReset} data-testid={`button-reset-${room.code}`}><RefreshCw size={14} /> {reset.isPending ? 'Resetowanie…' : 'Zresetuj losowanie'}</button> :
        <button className="button button-primary" disabled={draw.isPending || removeRoom.isPending || room.memberCount < 2} onClick={onDraw} data-testid={`button-draw-${room.code}`} title={room.memberCount < 2 ? 'Potrzeba co najmniej dwóch uczestników.' : ''}><Sparkles size={14} /> {draw.isPending ? 'Losowanie…' : 'Rozpocznij losowanie'}</button>}
        <button className="button button-danger" disabled={removeRoom.isPending || draw.isPending || reset.isPending} onClick={onDeleteRoom} data-testid={`button-delete-room-${room.code}`}><Trash2 size={14} /> {removeRoom.isPending ? 'Usuwanie…' : 'Usuń wymianę'}</button>
      </div>
    </div>
    {notice && <div className="error-box" style={{ marginTop: 13 }}>{notice}</div>}
    <div className="participants-admin">
      <div className="participants-admin-title"><strong>Osoby w wymianie</strong><span>{isLoading ? 'Wczytywanie…' : isError ? 'Nie udało się wczytać uczestników' : `${detail?.members.length ?? 0} osób`}</span></div>
      {detail?.members.length ? <div className="admin-members">{detail.members.map(member => <span className="admin-member-chip" key={member.id} data-testid={`admin-member-${room.code}-${member.id}`}><span className="member-avatar">{member.username.slice(0, 1).toUpperCase()}</span>{member.username}<span className={`wish-check ${member.hasWishlist ? 'has-wish' : ''}`}>{member.hasWishlist ? <Check size={12} /> : 'Lista do uzupełnienia'}</span>{!done && <button type="button" className="button button-quiet" style={{ padding: 4, minWidth: 24, minHeight: 24, borderRadius: '50%' }} aria-label={`Usuń ${member.username} z wymiany`} title={`Usuń ${member.username} z wymiany`} disabled={removeMember.isPending || removeRoom.isPending || draw.isPending} onClick={() => onDeleteMember(member.id, member.username)} data-testid={`button-delete-member-${room.code}-${member.id}`}><Trash2 size={12} /></button>}</span>)}</div> : !isLoading && !isError ? <p style={{ color: 'hsl(var(--muted-foreground))', fontSize: 11, marginBottom: 0 }}>Oczekiwanie na pierwszych uczestników.</p> : null}
    </div>
    <style>{`
      .admin-room{padding:21px 24px}.admin-room-top{display:flex;justify-content:space-between;align-items:center;gap:16px}.admin-metrics{display:grid;grid-template-columns:.8fr .9fr 1.2fr auto;gap:20px;align-items:center;margin:20px 0;padding:17px 0;border-top:1px solid hsl(var(--border));border-bottom:1px solid hsl(var(--border))}.admin-metrics>div:not(.completion):not(.admin-actions){display:grid;gap:5px}.admin-metrics strong{font-size:19px;color:hsl(var(--foreground))}.admin-metrics strong small{font-size:11px;color:hsl(var(--muted-foreground));font-weight:500}.completion{min-width:100px;color:hsl(var(--muted-foreground))}.progress-track{height:6px;background:hsl(var(--muted));border-radius:6px;overflow:hidden}.progress-track span{height:100%;display:block;border-radius:6px;background:hsl(var(--primary));transition:width .35s ease}.admin-actions{display:grid;gap:8px}.admin-actions .button{font-size:11px;padding:10px 12px;white-space:nowrap}.participants-admin-title{display:flex;justify-content:space-between;gap:12px;font-size:11px}.participants-admin-title span{color:hsl(var(--muted-foreground))}.admin-members{display:flex;gap:8px;flex-wrap:wrap;margin-top:11px}.admin-member-chip{display:flex;align-items:center;gap:7px;padding:5px 8px 5px 5px;border:1px solid hsl(var(--border));border-radius:999px;background:hsl(var(--background));font-size:10px}.admin-member-chip .member-avatar{width:24px;height:24px;border-radius:50%;font-size:10px}.wish-check{font-size:9px;color:hsl(var(--muted-foreground));padding-left:4px}.wish-check.has-wish{color:hsl(var(--primary));display:grid;place-items:center}.admin-room .error-box{font-size:11px}@media(max-width:760px){.admin-metrics{grid-template-columns:1fr 1fr;gap:15px}.admin-actions{grid-column:1/-1}.admin-actions .button{width:100%}.admin-room{padding:17px}.admin-room-top{align-items:flex-start}.admin-room-top>.status-pill{font-size:9px}}`}</style>
  </article>;
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('pl-PL', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
}

function NotFoundPage() {
  return <PageFrame><section className="panel" style={{ maxWidth: 550, textAlign: 'center', padding: 44, margin: '65px auto' }}>
    <div className="kicker">Zabłąkana paczka</div><h1 className="heading" style={{ fontSize: 38, margin: '10px 0' }}>Nie ma tu tej strony.</h1>
    <p style={{ color: 'hsl(var(--muted-foreground))', marginBottom: 22 }}>Sprawdź adres albo wróć do początku.</p><Link href="/" className="button button-primary" data-testid="link-not-found-home">Wróć na stronę główną <ArrowRight size={15} /></Link>
  </section></PageFrame>;
}

function Router() {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}><AppShell /></ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
