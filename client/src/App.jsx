import { Link, Navigate, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Forms from './pages/Forms';
import Builder from './pages/Builder';
import Results from './pages/Results';
import Team from './pages/Team';
import PublicForm from './pages/PublicForm';

function Protected({ children, roles }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

function Header() {
  const { user, logout } = useAuth();
  return (
    <header className="top">
      <Link to="/" className="brand">QuickForm</Link>
      {user ? (
        <>
          <nav aria-label="Main">
            <NavLink to="/" end>Forms</NavLink>
            {user.role === 'owner' && <NavLink to="/team">Team</NavLink>}
          </nav>
          <div className="row">
            <span className="who">{user.name}, {user.role}</span>
            <button className="btn small" onClick={logout}>Log out</button>
          </div>
        </>
      ) : (
        <div className="row">
          <Link to="/login" className="btn small">Sign in</Link>
          <Link to="/register" className="btn small solid">Create workspace</Link>
        </div>
      )}
    </header>
  );
}

export default function App() {
  const { user } = useAuth();
  const isPublic = useLocation().pathname.startsWith('/f/');

  // Respondents get a bare page with no app chrome.
  if (isPublic) {
    return (
      <Routes>
        <Route path="/f/:slug" element={<PublicForm />} />
      </Routes>
    );
  }

  return (
    <div className="page">
      <a href="#main" className="skip">Skip to content</a>
      <Header />
      <main id="main">
        <Routes>
          <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
          <Route path="/register" element={user ? <Navigate to="/" /> : <Register />} />
          <Route path="/" element={user ? <Forms /> : <Landing />} />
          <Route path="/forms/:id/edit" element={<Protected roles={['owner', 'editor']}><Builder /></Protected>} />
          <Route path="/forms/:id/results" element={<Protected><Results /></Protected>} />
          <Route path="/team" element={<Protected roles={['owner']}><Team /></Protected>} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
    </div>
  );
}
