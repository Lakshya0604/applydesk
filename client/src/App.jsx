import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  CirclePlus,
  LayoutDashboard,
  LogOut,
  Search,
  Sparkles,
  Target,
  Trash2,
  X,
} from "lucide-react";
import { api } from "./api";
const statuses = ["Saved", "Applied", "Interview", "Offer", "Rejected"];
const blank = {
  company: "",
  role: "",
  location: "",
  status: "Saved",
  url: "",
  appliedAt: "",
  followUpAt: "",
  notes: "",
};
const dateText = (value) =>
  value
    ? new Date(value).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        timeZone: "UTC",
      })
    : "";
const initials = (name) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((x) => x[0])
    .join("")
    .toUpperCase();
function Auth({ onLogin }) {
  const [register, setRegister] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const values = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const data = await api(`/auth/${register ? "register" : "login"}`, {
        method: "POST",
        body: JSON.stringify(values),
      });
      onLogin(data.user);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-page">
      <section className="auth-story">
        <a className="brand" href="/">
          <span className="brand-icon">
            <BriefcaseBusiness size={23} />
          </span>
          ApplyDesk
        </a>
        <div>
          <div className="eyebrow light">YOUR NEXT CHAPTER STARTS HERE</div>
          <h1>
            Less chaos.
            <br />
            More momentum.
          </h1>
          <p>
            Keep every opportunity, conversation and next step in one calm
            workspace.
          </p>
          <div className="story-card">
            <span className="story-dot" />
            <div>
              <strong>Your search, moving forward.</strong>
              <small>One application at a time.</small>
            </div>
            <ArrowUpRight />
          </div>
        </div>
        <small>Built for the journey. Focused on what's next.</small>
      </section>
      <section className="auth-form">
        <div>
          <span className="eyebrow">A LITTLE ORGANIZATION GOES A LONG WAY</span>
          <h2>{register ? "Make room for opportunity." : "Welcome back."}</h2>
          <p>
            {register
              ? "Create your private application workspace."
              : "Pick up right where you left off."}
          </p>
          <form onSubmit={submit}>
            {register && (
              <label>
                Your name
                <input
                  name="name"
                  autoComplete="name"
                  minLength={2}
                  maxLength={80}
                  required
                  placeholder="Alex Morgan"
                />
              </label>
            )}
            <label>
              Email address
              <input
                type="email"
                name="email"
                autoComplete="email"
                required
                placeholder="you@example.com"
              />
            </label>
            <label>
              Password
              <input
                type="password"
                name="password"
                autoComplete={register ? "new-password" : "current-password"}
                minLength={8}
                maxLength={72}
                required
                placeholder="At least 8 characters"
              />
            </label>
            {error && (
              <p role="alert" className="error">
                {error}
              </p>
            )}
            <button className="primary full" disabled={busy}>
              {busy
                ? "Please wait..."
                : register
                  ? "Create account"
                  : "Sign in"}
              <ArrowUpRight size={18} />
            </button>
          </form>
          <p className="auth-switch">
            {register ? "Already have an account?" : "New to ApplyDesk?"}{" "}
            <button
              onClick={() => {
                setRegister(!register);
                setError("");
              }}
            >
              {register ? "Sign in" : "Create an account"}
            </button>
          </p>
          <p className="privacy">
            Your applications stay private to your account.
          </p>
        </div>
      </section>
    </div>
  );
}
function ApplicationForm({ item, onClose, onSave }) {
  const [values, setValues] = useState(
    item
      ? {
          ...blank,
          ...item,
          appliedAt: item.appliedAt?.slice(0, 10) || "",
          followUpAt: item.followUpAt?.slice(0, 10) || "",
        }
      : blank,
  );
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const dialog = useRef();
  useEffect(() => {
    const node = dialog.current;
    node.showModal();
    return () => node.close();
  }, []);
  const change = (event) =>
    setValues((old) => ({ ...old, [event.target.name]: event.target.value }));
  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const body = Object.fromEntries(
      Object.keys(blank).map((key) => [key, values[key]]),
    );
    try {
      await api(`/applications${item ? `/${item._id}` : ""}`, {
        method: item ? "PATCH" : "POST",
        body: JSON.stringify(body),
      });
      onSave();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <dialog ref={dialog} className="modal" onCancel={onClose}>
      <div className="modal-top">
        <div>
          <span className="eyebrow">KEEP THE MOMENTUM</span>
          <h2>{item ? "Edit application" : "A new opportunity"}</h2>
        </div>
        <button
          className="icon-button"
          onClick={onClose}
          aria-label="Close form"
        >
          <X />
        </button>
      </div>
      <form onSubmit={submit}>
        <div className="form-grid">
          <label>
            Company
            <input
              autoFocus
              required
              name="company"
              maxLength={120}
              value={values.company}
              onChange={change}
              placeholder="Company name"
            />
          </label>
          <label>
            Role
            <input
              required
              name="role"
              maxLength={120}
              value={values.role}
              onChange={change}
              placeholder="Software engineer"
            />
          </label>
          <label>
            Location
            <input
              name="location"
              maxLength={120}
              value={values.location}
              onChange={change}
              placeholder="Remote / city"
            />
          </label>
          <label>
            Status
            <select name="status" value={values.status} onChange={change}>
              {statuses.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <label>
            Applied on
            <input
              type="date"
              name="appliedAt"
              value={values.appliedAt}
              onChange={change}
            />
          </label>
          <label>
            Follow up on
            <input
              type="date"
              name="followUpAt"
              value={values.followUpAt}
              onChange={change}
            />
          </label>
        </div>
        <label>
          Job link
          <input
            type="url"
            name="url"
            maxLength={1000}
            value={values.url}
            onChange={change}
            placeholder="https://..."
          />
        </label>
        <label>
          Notes
          <textarea
            name="notes"
            rows={3}
            maxLength={3000}
            value={values.notes}
            onChange={change}
            placeholder="Interview prep, contacts, or anything worth remembering..."
          />
        </label>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <div className="modal-actions">
          <button type="button" className="secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="primary" disabled={busy}>
            <Check size={17} />
            {busy ? "Saving..." : "Save application"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
export default function App() {
  const [user, setUser] = useState(null),
    [checking, setChecking] = useState(true);
  const [items, setItems] = useState([]),
    [stats, setStats] = useState(null),
    [total, setTotal] = useState(0),
    [pages, setPages] = useState(1);
  const [search, setSearch] = useState(""),
    [query, setQuery] = useState(""),
    [status, setStatus] = useState(""),
    [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [modal, setModal] = useState(undefined),
    [refresh, setRefresh] = useState(0);
  const requestId = useRef(0);
  useEffect(() => {
    api("/auth/me")
      .then((d) => setUser(d.user))
      .catch((e) => {
        if (e.status !== 401) setError(e.message);
      })
      .finally(() => setChecking(false));
  }, []);
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);
  useEffect(() => {
    if (!user) return;
    const id = ++requestId.current;
    setLoading(true);
    setError("");
    const params = new URLSearchParams({
      page,
      ...(query && { q: query }),
      ...(status && { status }),
    });
    Promise.all([api(`/applications?${params}`), api("/applications/stats")])
      .then(([list, summary]) => {
        if (id !== requestId.current) return;
        if (page > list.pages) {
          setPage(list.pages);
          return;
        }
        setItems(list.items);
        setTotal(list.total);
        setPages(list.pages);
        setStats(summary);
      })
      .catch((e) => {
        if (id === requestId.current) {
          setError(e.message);
          if (e.status === 401) setUser(null);
        }
      })
      .finally(() => {
        if (id === requestId.current) setLoading(false);
      });
    return () => {
      requestId.current++;
    };
  }, [user, page, query, status, refresh]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 3500);
    return () => clearTimeout(timer);
  }, [notice]);
  async function logout() {
    try {
      await api("/auth/logout", { method: "POST", body: "{}" });
      setUser(null);
      setStats(null);
      setItems([]);
      setSearch("");
      setStatus("");
      setPage(1);
    } catch (e) {
      setError(e.message);
    }
  }
  async function remove(item) {
    if (
      !confirm(
        `Delete the ${item.role} application at ${item.company}? This cannot be undone.`,
      )
    )
      return;
    try {
      await api(`/applications/${item._id}`, { method: "DELETE", body: "{}" });
      setRefresh((v) => v + 1);
      setNotice("Application deleted.");
    } catch (e) {
      setError(e.message);
    }
  }
  if (checking) return <div className="boot">Opening your workspace...</div>;
  if (!user)
    return (
      <>
        <Auth onLogin={setUser} />
        {error && (
          <div role="alert" className="toast error">
            {error}
          </div>
        )}
      </>
    );
  const active = (stats?.counts.Applied || 0) + (stats?.counts.Interview || 0);
  return (
    <div className="workspace">
      <aside className="sidebar">
        <a href="/" className="brand">
          <span className="brand-icon">
            <BriefcaseBusiness size={22} />
          </span>
          ApplyDesk
        </a>
        <div className="sidebar-label">WORKSPACE</div>
        <div className="nav-active">
          <LayoutDashboard size={18} />
          Applications<span>{stats?.total || 0}</span>
        </div>
        <div className="sidebar-tip">
          <Sparkles size={22} />
          <strong>Small steps. Big possibilities.</strong>
          <p>Every application is a step toward your next chapter.</p>
        </div>
        <div className="user-block">
          <div className="avatar">{initials(user.name)}</div>
          <div>
            <strong>{user.name}</strong>
            <small>Your personal workspace</small>
          </div>
          <button
            className="icon-button"
            onClick={logout}
            aria-label="Sign out"
          >
            <LogOut size={17} />
          </button>
        </div>
      </aside>
      <main className="main">
        <header className="topbar">
          <span>
            Workspace <ChevronRight size={14} /> <strong>Applications</strong>
          </span>
          <span className="today">
            <CalendarDays size={15} />
            {new Date().toLocaleDateString("en-GB", {
              weekday: "short",
              day: "numeric",
              month: "short",
            })}
          </span>
        </header>
        <div className="content">
          <div className="page-title">
            <div>
              <div className="eyebrow">ONE WORKSPACE. EVERY OPPORTUNITY.</div>
              <h1>Your next chapter.</h1>
              <p>
                A little clarity for your job search. Let's keep things moving.
              </p>
            </div>
            <button className="primary" onClick={() => setModal(null)}>
              <CirclePlus size={18} />
              Add application
            </button>
          </div>
          <section className="stats" aria-label="Application overview">
            {[
              {
                label: "Total applications",
                value: stats?.total || 0,
                detail: "All your opportunities",
                icon: BriefcaseBusiness,
              },
              {
                label: "In progress",
                value: active,
                detail: "Applied + interviewing",
                icon: Target,
              },
              {
                label: "Interviews",
                value: stats?.counts.Interview || 0,
                detail: "Conversations that count",
                icon: CalendarDays,
              },
              {
                label: "Offers received",
                value: stats?.counts.Offer || 0,
                detail: "A reason to celebrate",
                icon: Sparkles,
              },
            ].map(({ label, value, detail, icon: Icon }, i) => (
              <article key={label} className={`stat stat-${i}`}>
                <div>
                  <span>{label}</span>
                  <Icon size={19} />
                </div>
                <strong>{stats ? value : "-"}</strong>
                <small>{detail}</small>
              </article>
            ))}
          </section>
          <div className="followup">
            <span className="follow-icon">
              <CalendarDays size={21} />
            </span>
            <div>
              <strong>
                {stats?.followUpsDue
                  ? `${stats.followUpsDue} follow-up${stats.followUpsDue === 1 ? "" : "s"} ready for your attention`
                  : "Stay one step ahead"}
              </strong>
              <p>
                {stats?.followUpsDue
                  ? "Check your follow-up dates below and make your next move."
                  : "Add a follow-up date to an application so nothing slips through."}
              </p>
            </div>
            <span className="pill">{stats?.followUpsDue || 0} due</span>
          </div>
          <section className="applications">
            <div className="list-heading">
              <div>
                <h2>
                  Application board <span>{total}</span>
                </h2>
                <p>Keep track of where you are, and where you're headed.</p>
              </div>
              <label className="search">
                <Search size={17} />
                <input
                  aria-label="Search applications"
                  placeholder="Search company, role or location"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    aria-label="Clear search"
                  >
                    <X size={14} />
                  </button>
                )}
              </label>
            </div>
            <div className="tabs" role="group" aria-label="Filter by status">
              {["", ...statuses].map((s) => (
                <button
                  key={s}
                  className={status === s ? "selected" : ""}
                  onClick={() => {
                    setStatus(s);
                    setPage(1);
                  }}
                >
                  {s || "All applications"}
                  <span>{s ? stats?.counts[s] || 0 : stats?.total || 0}</span>
                </button>
              ))}
            </div>
            {error && (
              <p role="alert" className="error inline">
                {error}
                <button
                  className="text-button"
                  onClick={() => setRefresh((v) => v + 1)}
                >
                  Retry
                </button>
              </p>
            )}
            <div aria-live="polite" aria-busy={loading}>
              {loading ? (
                <div className="loading">Loading applications...</div>
              ) : items.length ? (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>COMPANY & ROLE</th>
                        <th>STATUS</th>
                        <th>APPLIED</th>
                        <th>FOLLOW-UP</th>
                        <th>
                          <span className="sr-only">Actions</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item) => {
                        const due =
                          item.followUpAt &&
                          !["Offer", "Rejected"].includes(item.status) &&
                          item.followUpAt.slice(0, 10) <=
                            new Date().toISOString().slice(0, 10);
                        return (
                          <tr key={item._id}>
                            <td>
                              <div className="company-cell">
                                <div
                                  className={`company-mark mark-${item.company.charCodeAt(0) % 4}`}
                                >
                                  {initials(item.company)}
                                </div>
                                <div>
                                  <button
                                    className="company-link"
                                    onClick={() => setModal(item)}
                                  >
                                    {item.company}
                                  </button>
                                  <span>{item.role}</span>
                                  <small>
                                    {item.location || "Location not added"}
                                  </small>
                                </div>
                              </div>
                            </td>
                            <td>
                              <span
                                className={`status status-${item.status.toLowerCase()}`}
                              >
                                <i />
                                {item.status}
                              </span>
                            </td>
                            <td className="date-cell">
                              {dateText(item.appliedAt) || (
                                <span className="muted">Not yet</span>
                              )}
                            </td>
                            <td className="date-cell">
                              {item.followUpAt ? (
                                <span className={due ? "due" : ""}>
                                  {dateText(item.followUpAt)}
                                  {due && <small>Due now</small>}
                                </span>
                              ) : (
                                <span className="muted">No reminder</span>
                              )}
                            </td>
                            <td>
                              <div className="row-actions">
                                {item.url && (
                                  <a
                                    className="icon-button"
                                    href={item.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    aria-label={`Open job at ${item.company}`}
                                  >
                                    <ArrowUpRight size={17} />
                                  </a>
                                )}
                                <button
                                  className="icon-button delete"
                                  onClick={() => remove(item)}
                                  aria-label={`Delete ${item.company} application`}
                                >
                                  <Trash2 size={15} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty">
                  <span>
                    <BriefcaseBusiness size={32} />
                  </span>
                  <h3>
                    {query || status
                      ? "No matching opportunities."
                      : "Your board is a fresh start."}
                  </h3>
                  <p>
                    {query || status
                      ? "Try another search or status filter."
                      : "Save your first application and give your job search a little structure."}
                  </p>
                  {!query && !status && (
                    <button className="primary" onClick={() => setModal(null)}>
                      <CirclePlus size={17} />
                      Add your first application
                    </button>
                  )}
                </div>
              )}
            </div>
            <footer className="list-footer">
              <span>
                {total
                  ? `Showing ${(page - 1) * 12 + 1}-${Math.min(page * 12, total)} of ${total} applications`
                  : "No applications to show"}
              </span>
              <div>
                <button
                  className="icon-button"
                  aria-label="Previous page"
                  disabled={page === 1 || loading}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft size={17} />
                </button>
                <span>
                  Page {page} of {pages}
                </span>
                <button
                  className="icon-button"
                  aria-label="Next page"
                  disabled={page >= pages || loading}
                  onClick={() => setPage((p) => p + 1)}
                >
                  <ChevronRight size={17} />
                </button>
              </div>
            </footer>
          </section>
          <p className="footnote">
            Progress isn't always a straight line. Keep going.
          </p>
        </div>
      </main>
      {modal !== undefined && (
        <ApplicationForm
          item={modal}
          onClose={() => setModal(undefined)}
          onSave={() => {
            setModal(undefined);
            setRefresh((v) => v + 1);
            setNotice("Application saved.");
          }}
        />
      )}
      {notice && (
        <div className="toast" role="status">
          <Check size={18} />
          {notice}
        </div>
      )}
    </div>
  );
}
