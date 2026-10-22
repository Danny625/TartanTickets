import CheckinForm from '../../components/CheckinForm';

export const metadata = { title: 'Demo check-in | Tartan Tickets' };

export default function CheckinPage() {
  return <>
    <a className="skip-link" href="#checkin">Skip to check-in</a>
    <header className="site-header"><a className="brand" href="/"><span className="brand-mark" aria-hidden="true">t.</span>Tartan<span className="brand-light">Tickets</span></a><a className="checkin-nav" href="/">Browse events</a></header>
    <main className="checkin-page" id="checkin">
      <p className="eyebrow">STORY 6 · SAMPLE TICKETS ONLY</p>
      <h1>Demo check-in<span>.</span></h1>
      <p className="checkin-intro">Enter a sample ticket’s QR token to mark it used. Manual token entry stands in for scanning; no camera is needed.</p>
      <div className="checkin-limitations"><strong>Homework demo — no real admission.</strong> Your typed officer name is a label, not authentication or officer authorization. Tokens and check-in state live in server memory, reset on restart/deploy, and are not shared across Vercel instances. Duplicate prevention works only within one running process.</div>
      <CheckinForm />
    </main>
  </>;
}
