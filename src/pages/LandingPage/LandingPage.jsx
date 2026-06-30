import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import './LandingPage.css';

/* ═══════════════════════════════════════════════════════════
   Dot-grid Canvas Background (Hero)
   ═══════════════════════════════════════════════════════════ */
function DotGridCanvas() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let animationId;
    let mouseX = -1000;
    let mouseY = -1000;

    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };

    const handleMouse = (e) => {
      const rect = canvas.getBoundingClientRect();
      mouseX = e.clientX - rect.left;
      mouseY = e.clientY - rect.top;
    };

    const draw = () => {
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      ctx.clearRect(0, 0, w, h);

      const spacing = 32;
      const maxDist = 120;
      const baseRadius = 1;
      const maxRadius = 3;
      const baseBrightness = 30;
      const maxBrightness = 100;

      for (let x = spacing; x < w; x += spacing) {
        for (let y = spacing; y < h; y += spacing) {
          const dx = mouseX - x;
          const dy = mouseY - y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const influence = Math.max(0, 1 - dist / maxDist);

          const radius = baseRadius + influence * (maxRadius - baseRadius);
          const brightness = baseBrightness + influence * (maxBrightness - baseBrightness);

          ctx.beginPath();
          ctx.arc(x, y, radius, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${brightness}, ${brightness}, ${brightness}, ${0.3 + influence * 0.5})`;
          ctx.fill();
        }
      }

      animationId = requestAnimationFrame(draw);
    };

    resize();
    draw();

    window.addEventListener('resize', resize);
    canvas.parentElement.addEventListener('mousemove', handleMouse);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
      canvas.parentElement?.removeEventListener('mousemove', handleMouse);
    };
  }, []);

  return <canvas ref={canvasRef} className="landing-hero__canvas" />;
}

/* ═══════════════════════════════════════════════════════════
   Scroll Reveal Hook
   ═══════════════════════════════════════════════════════════ */
function useScrollReveal() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );

    const elements = document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale');
    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);
}

/* ═══════════════════════════════════════════════════════════
   Animated Counter
   ═══════════════════════════════════════════════════════════ */
function AnimatedStat({ value, label, suffix = '' }) {
  const ref = useRef(null);
  const counted = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !counted.current) {
          counted.current = true;
          let start = 0;
          const end = parseInt(value, 10);
          const duration = 1500;
          const startTime = performance.now();

          const animate = (now) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // Ease out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = Math.round(start + (end - start) * eased);
            el.textContent = current + suffix;
            if (progress < 1) requestAnimationFrame(animate);
          };

          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [value, suffix]);

  return (
    <div className="stat-item reveal stagger-1">
      <div ref={ref} className="stat-item__number">0{suffix}</div>
      <div className="stat-item__label">{label}</div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Section Divider
   ═══════════════════════════════════════════════════════════ */
function Divider() {
  return (
    <div className="landing-divider">
      <div className="landing-divider__line" />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════ */
export default function LandingPage() {
  useScrollReveal();

  return (
    <div id="landing-page">

      {/* ── HERO ─────────────────────────────────────────── */}
      <section className="landing-hero" id="hero">
        <DotGridCanvas />

        {/* Gradient orbs */}
        <div className="landing-hero__gradient-orb landing-hero__gradient-orb--saffron" />
        <div className="landing-hero__gradient-orb landing-hero__gradient-orb--teal" />

        <div className="landing-hero__content">
          <h1 className="landing-hero__headline reveal">
            <em>From Voice Note</em><br />to Civic Action.
          </h1>
          <p className="landing-hero__subhead reveal stagger-1">
            JanSetu is an autonomous civic platform. A citizen speaks the problem. Five AI agents classify it, route it, escalate it when officials go quiet, and keep a public record of everything that happens next.
          </p>
          <div className="landing-hero__ctas reveal stagger-2">
            <Link to="/report" className="landing-hero__cta-primary">
              ● Report an Issue
            </Link>
            <Link to="/ledger" className="landing-hero__cta-secondary">
              ◉ View the Public Ledger
            </Link>
          </div>

          {/* Stats */}
          <div className="stats-row reveal stagger-3">
            <AnimatedStat value="5" label="AI Agents" />
            <AnimatedStat value="9" label="Google APIs" />
            <AnimatedStat value="0" label="Forms to Fill" />
            <AnimatedStat value="100" label="Transparency" suffix="%" />
          </div>
        </div>

        <div className="landing-hero__scroll-hint">
          <span>Scroll</span>
          <div className="landing-hero__scroll-line" />
        </div>
      </section>


      <Divider />


      {/* ── PROBLEM ──────────────────────────────────────── */}
      <section className="landing-section" id="problem">
        <div className="landing-section__header">
          <span className="section-eyebrow reveal">Why civic apps don't work</span>
          <h2 className="landing-section__headline reveal stagger-1">Two failures, one fix.</h2>
        </div>

        <div className="problem-grid">
          <div className="problem-card reveal-left">
            <div className="problem-card__icon problem-card__icon--saffron">🗣️</div>
            <h3 className="problem-card__title">The Participation Gap</h3>
            <p className="problem-card__text">
              Civic apps are built for the person who already owns the problem: app-literate, comfortable in English, willing to fill a form. That person reports issues at a far higher rate than the person actually living next to the broken drain. JanSetu's entry point is a voice note in whatever language the citizen already speaks — no install, no account, no form.
            </p>
          </div>

          <div className="problem-card reveal-right">
            <div className="problem-card__icon problem-card__icon--teal">⏱️</div>
            <h3 className="problem-card__title">The Accountability Gap</h3>
            <p className="problem-card__text">
              Reporting an issue and having it acted on are two different problems, and most platforms only solve the first one. A ticket gets filed, sits in a queue, and nobody follows up. JanSetu's Escalation Agent watches every open ticket against a deadline and writes the follow-up letter itself the moment that deadline passes.
            </p>
          </div>
        </div>

        <div className="reveal stagger-2" style={{ marginTop: 32 }}>
          <div className="callout" style={{ maxWidth: 700 }}>
            <p style={{ margin: 0, color: '#ccc', fontStyle: 'italic' }}>
              Citizens shouldn't need fluency in bureaucracy to be heard, and a filed complaint shouldn't depend on someone remembering to chase it.
            </p>
          </div>
        </div>
      </section>


      <Divider />


      {/* ── PILLARS ──────────────────────────────────────── */}
      <section className="landing-section" id="pillars">
        <div className="landing-section__header">
          <span className="section-eyebrow reveal">What JanSetu does</span>
          <h2 className="landing-section__headline reveal stagger-1">Four systems, working without supervision.</h2>
        </div>

        <div className="pillars-grid">
          <div className="pillar-card reveal stagger-1">
            <span className="pillar-card__number">01</span>
            <h3 className="pillar-card__title">Zero-UI Reporting</h3>
            <p className="pillar-card__text">
              The citizen speaks, types, or photographs the problem. No form fields, no category dropdowns. Gemini extracts the issue type, severity, and location from raw text or voice — including Hindi and Punjabi, handled natively.
            </p>
          </div>

          <div className="pillar-card reveal stagger-2">
            <span className="pillar-card__number">02</span>
            <h3 className="pillar-card__title">Accountability Pressure Engine</h3>
            <p className="pillar-card__text">
              Every open ticket runs against an SLA clock. When an officer goes quiet past the deadline, the Escalation Agent drafts a formal letter and sends it to the citizen for one-tap approval.
            </p>
          </div>

          <div className="pillar-card reveal stagger-3">
            <span className="pillar-card__number">03</span>
            <h3 className="pillar-card__title">Predictive Budget Intelligence</h3>
            <p className="pillar-card__text">
              JanSetu clusters resolved and open issues by zone, then estimates the Cost of Inaction: what a recurring, unfixed problem is likely costing a neighborhood over time.
            </p>
          </div>

          <div className="pillar-card reveal stagger-4">
            <span className="pillar-card__number">04</span>
            <h3 className="pillar-card__title">Public Transparency Ledger</h3>
            <p className="pillar-card__text">
              Every issue, status change, and escalation event lands on a public, read-only page. No login, no officer can edit it after the fact. A running receipt of what was promised and what happened.
            </p>
          </div>
        </div>
      </section>


      <Divider />


      {/* ── HOW IT WORKS ─────────────────────────────────── */}
      <section className="landing-section" id="how-it-works">
        <div className="landing-section__header">
          <span className="section-eyebrow reveal">Three roles, one platform</span>
          <h2 className="landing-section__headline reveal stagger-1">
            Built for the person reporting, the person fixing, and the person checking.
          </h2>
        </div>

        <div className="roles-grid">
          <div className="role-card reveal stagger-1">
            <div className="role-card__icon">🙋</div>
            <span className="role-card__role-label">The Citizen</span>
            <h3 className="role-card__title">Speak it. Done.</h3>
            <p className="role-card__narrative">
              She records a fifteen-second voice note about a broken streetlight on her way to work. No app download, no signup. Thirty seconds later she gets a ticket number and watches a status panel: <em>submitted → classified → assigned</em>. A week later, a notification asks her to approve an escalation letter with one tap because nobody's touched the ticket. She taps yes and moves on with her day.
            </p>
          </div>

          <div className="role-card reveal stagger-2">
            <div className="role-card__icon">👨‍💼</div>
            <span className="role-card__role-label">The Officer</span>
            <h3 className="role-card__title">Prioritized by consequence.</h3>
            <p className="role-card__narrative">
              He opens a dashboard that doesn't show him three hundred raw complaints in chronological order. It shows a queue ranked by Cost of Inaction — the leaking pipe near the school outranks the faded paint job, because the system has done that math for him. He marks a ticket resolved and uploads a photo. The Verification Agent compares it against the original image and confirms the fix.
            </p>
          </div>

          <div className="role-card reveal stagger-3">
            <div className="role-card__icon">🔍</div>
            <span className="role-card__role-label">The Public Observer</span>
            <h3 className="role-card__title">Accountability, no login.</h3>
            <p className="role-card__narrative">
              A journalist, an RTI activist, or just a curious resident opens the Public Ledger with no login. Every ticket, every SLA breach, every escalation letter sent and every resolution claimed is there, timestamped, in order. The part of the product that makes the other two flows accountable to someone besides the officer marking their own homework.
            </p>
          </div>
        </div>
      </section>


      <Divider />


      {/* ── UNDER THE HOOD — AGENTS ──────────────────────── */}
      <section className="landing-section" id="agents">
        <div className="landing-section__header">
          <span className="section-eyebrow reveal">Under the hood</span>
          <h2 className="landing-section__headline reveal stagger-1">Five agents. Five jobs. No black box.</h2>
          <p className="landing-section__body reveal stagger-2">
            Each agent has a defined input, a single reasoning task, and a structured output. None of them is one giant prompt doing five jobs badly.
          </p>
        </div>

        {/* Agent Chain Pipeline */}
        <div className="agent-pipeline reveal">
          <div className="agent-pipeline__node">
            <div className="agent-pipeline__node-icon">📋</div>
            <span className="agent-pipeline__node-label">Triage</span>
          </div>
          <span className="agent-pipeline__arrow">→</span>

          <div className="agent-pipeline__node">
            <div className="agent-pipeline__node-icon">🔗</div>
            <span className="agent-pipeline__node-label">Dedup</span>
          </div>
          <span className="agent-pipeline__arrow">→</span>

          <div className="agent-pipeline__node">
            <div className="agent-pipeline__node-icon">⚡</div>
            <span className="agent-pipeline__node-label">Escalation</span>
          </div>
          <span className="agent-pipeline__arrow">→</span>

          <div className="agent-pipeline__node">
            <div className="agent-pipeline__node-icon">📊</div>
            <span className="agent-pipeline__node-label">COI Engine</span>
          </div>
          <span className="agent-pipeline__arrow">→</span>

          <div className="agent-pipeline__node">
            <div className="agent-pipeline__node-icon">✅</div>
            <span className="agent-pipeline__node-label">Verification</span>
          </div>
        </div>

        {/* Agent Table */}
        <div className="reveal stagger-2">
          <table className="agent-table">
            <thead>
              <tr>
                <th>Agent</th>
                <th>Job</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="agent-table__name">Triage</td>
                <td className="agent-table__job">Turns a voice note, photo, or text message into a structured ticket: category, severity, location, infrastructure type.</td>
              </tr>
              <tr>
                <td className="agent-table__name">Duplicate Detector</td>
                <td className="agent-table__job">Checks new tickets against open issues nearby and decides: new issue, merge into a cluster, or exact duplicate.</td>
              </tr>
              <tr>
                <td className="agent-table__name">Escalation</td>
                <td className="agent-table__job">Scans for tickets past deadline and drafts the follow-up letter without being asked.</td>
              </tr>
              <tr>
                <td className="agent-table__name">Insight / COI Engine</td>
                <td className="agent-table__job">Finds patterns across zones and estimates what unresolved clusters are costing the area.</td>
              </tr>
              <tr>
                <td className="agent-table__name">Verification</td>
                <td className="agent-table__job">Compares before-and-after photos to confirm a resolution claim is real.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>


      <Divider />


      {/* ── BUILT ON GOOGLE ──────────────────────────────── */}
      <section className="landing-section" id="built-on-google">
        <div className="landing-section__header">
          <span className="section-eyebrow reveal">The Stack</span>
          <h2 className="landing-section__headline reveal stagger-1">Built on Google. Nine services, each doing a specific job.</h2>
        </div>

        <div className="google-grid">
          <div className="google-chip reveal stagger-1">
            <div className="google-chip__icon">🧠</div>
            <span>Gemini 1.5 Pro</span>
          </div>
          <div className="google-chip reveal stagger-1">
            <div className="google-chip__icon">🔎</div>
            <span>Gemini Search Grounding</span>
          </div>
          <div className="google-chip reveal stagger-2">
            <div className="google-chip__icon">🗺️</div>
            <span>Maps JavaScript API</span>
          </div>
          <div className="google-chip reveal stagger-2">
            <div className="google-chip__icon">📍</div>
            <span>Geocoding API</span>
          </div>
          <div className="google-chip reveal stagger-3">
            <div className="google-chip__icon">🏢</div>
            <span>Places API</span>
          </div>
          <div className="google-chip reveal stagger-3">
            <div className="google-chip__icon">🔥</div>
            <span>Cloud Firestore</span>
          </div>
          <div className="google-chip reveal stagger-4">
            <div className="google-chip__icon">🔐</div>
            <span>Firebase Auth</span>
          </div>
          <div className="google-chip reveal stagger-4">
            <div className="google-chip__icon">📦</div>
            <span>Firebase Storage</span>
          </div>
          <div className="google-chip reveal stagger-5">
            <div className="google-chip__icon">⚙️</div>
            <span>Cloud Functions</span>
          </div>
        </div>
      </section>


      <Divider />


      {/* ── CLOSING PITCH ────────────────────────────────── */}
      <section className="landing-closing" id="closing">
        <div className="landing-closing__bg-orb landing-closing__bg-orb--saffron" />
        <div className="landing-closing__bg-orb landing-closing__bg-orb--teal" />

        <div className="landing-closing__content">
          <blockquote className="landing-closing__quote reveal">
            "JanSetu speaks the citizen's language, calculates the <em>cost of bureaucratic inaction</em>, and files the paperwork when officials don't."
          </blockquote>

          <div className="landing-closing__ctas reveal stagger-1">
            <Link to="/report" className="landing-hero__cta-primary" style={{ animation: 'none' }}>
              Try the Demo
            </Link>
            <Link to="/ledger" className="landing-hero__cta-secondary">
              Read the Ledger
            </Link>
          </div>
        </div>
      </section>



    </div>
  );
}
