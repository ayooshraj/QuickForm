import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Bars from '../components/Bars';

const SEED = [
  { n: 'Hugo', p: 'Pro', r: 4 }, { n: 'Gia', p: 'Enterprise', r: 3 }, { n: 'Farid', p: 'Pro', r: 5 }, { n: 'Esha', p: 'Free', r: 4 },
  { n: 'Dev', p: 'Enterprise', r: 3 }, { n: 'Chloe', p: 'Pro', r: 5 }, { n: 'Ben', p: 'Pro', r: 4 }, { n: 'Ava', p: 'Free', r: 3 },
];
const PLANS = ['Free', 'Pro', 'Enterprise'];

const tally = (rows, key) => rows.reduce((acc, d) => ({ ...acc, [d[key]]: (acc[d[key]] || 0) + 1 }), {});

// A working example of the product: submitting the sample form updates the dashboard below it.
export default function Landing() {
  const [rows, setRows] = useState(SEED);
  const [name, setName] = useState('');
  const [plan, setPlan] = useState('Pro');
  const [error, setError] = useState('');
  const [fresh, setFresh] = useState(false);
  const [stampKey, setStampKey] = useState(0);
  const nameRef = useRef(null);

  const send = (e) => {
    e.preventDefault();
    if (!name.trim()) { setError('Enter a name to send the form.'); nameRef.current?.focus(); return; }
    setError('');
    setRows([{ n: name.trim().slice(0, 24), p: plan, r: 3 + Math.floor(Math.random() * 3) }, ...rows]);
    setName(''); setFresh(true); setStampKey((k) => k + 1);
  };

  const plans = tally(rows, 'p');
  const stars = tally(rows, 'r');
  const total = rows.length;
  const avg = (rows.reduce((s, d) => s + d.r, 0) / total).toFixed(1);
  const best = Object.keys(plans).sort((a, b) => plans[b] - plans[a])[0];

  return (
    <>
      <section className="hero">
        <div>
          <h1>Send a form. Watch the answers come in.</h1>
          <p className="lead">Build a form, share the link, and every response lands on your team's dashboard the moment it is sent. Fill in the form on the right to try it.</p>
          <div className="row">
            <Link to="/register" className="btn solid">Create your workspace</Link>
            <a href="#results" className="btn">See the results view</a>
          </div>
        </div>

        <div className="stage">
          <form className="sheet" onSubmit={send} noValidate>
            <h2 className="ftitle">Customer feedback</h2>
            <p className="muted small" style={{ marginBottom: 18 }}>Tell us how we are doing. Takes under a minute.</p>
            <label className="field">
              <span className="label">Your name</span>
              <input ref={nameRef} value={name} onChange={(e) => setName(e.target.value)} placeholder="Type a name…" autoComplete="off" />
              <div className="error" role="alert">{error}</div>
            </label>
            <div className="field">
              <span className="label" id="plan-l">Which plan are you on?</span>
              <div className="choices" role="radiogroup" aria-labelledby="plan-l">
                {PLANS.map((p) => (
                  <label key={p} className="choice">
                    <input type="radio" name="plan" checked={plan === p} onChange={() => setPlan(p)} /><span>{p}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="row between">
              <button className="btn solid" type="submit">Send response</button>
              <span className="muted small">Example form. Nothing leaves this page.</span>
            </div>
            {stampKey > 0 && <div key={stampKey} className="stamp hit" aria-hidden="true">Received</div>}
          </form>

          <div className="log" aria-live="polite">
            <h3>Your dashboard <span className="num">{total} received</span></h3>
            <ul>
              {rows.slice(0, 4).map((d, i) => (
                <li key={`${d.n}-${total - i}`} className={i === 0 && fresh ? 'new' : ''}>
                  <b>{d.n}</b><span>{d.p}</span><span className="num">{d.r} of 5</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="band" id="results">
        <h2>Every answer, counted as it arrives.</h2>
        <p className="sum" style={{ marginBottom: 36 }}>
          <b>{total} responses.</b> {best} is the most common plan, chosen by {plans[best]}. The average rating is <b>{avg} out of 5</b>.
        </p>
        <div className="cols2">
          <div className="q"><h3>Which plan are you on?</h3><p className="n">{total} answers</p><Bars counts={{ Free: plans.Free || 0, Pro: plans.Pro || 0, Enterprise: plans.Enterprise || 0 }} /></div>
          <div className="q"><h3>How was it?</h3><p className="n">Average {avg} from {total} answers</p><Bars counts={{ 5: stars[5] || 0, 4: stars[4] || 0, 3: stars[3] || 0, 2: stars[2] || 0, 1: stars[1] || 0 }} /></div>
        </div>
      </section>

      <section className="band" id="how">
        <div className="cols3">
          <div><h3>Build</h3><p>Ten field types, required flags and reordering. Questions are saved by key, so renaming one never breaks old answers.</p></div>
          <div><h3>Share</h3><p>Publishing creates a link nobody can guess. Close the form and it stops accepting answers.</p></div>
          <div><h3>Watch</h3><p>Owners and editors see each response live. Viewers see the charts and never the raw answers.</p></div>
        </div>
      </section>

      <footer className="foot">QuickForm keeps each organisation's forms and responses separate. Owners manage the team, editors build forms, viewers see analytics.</footer>
    </>
  );
}
