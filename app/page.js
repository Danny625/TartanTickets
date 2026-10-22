import EventBrowser from '../components/EventBrowser';
import { listPublicEvents } from '../lib/events.mjs';

export const dynamic = 'force-dynamic';

export default function Home() {
  return (
    <>
      <a className="skip-link" href="#events">Skip to events</a>
      <header className="site-header">
        <a href="/" className="brand" aria-label="Tartan Tickets home"><span className="brand-mark" aria-hidden="true">t.</span>Tartan<span className="brand-light">Tickets</span></a>
        <span className="campus-label">CARNEGIE MELLON UNIVERSITY</span>
        <span className="demo-badge">Campus demo</span>
      </header>
      <main>
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-copy">
            <p className="eyebrow"><span aria-hidden="true">●</span> MADE FOR YOUR CAMPUS</p>
            <h1 id="hero-title">Good plans.<br />Great <span>company.</span></h1>
            <p className="hero-description">Your next favorite night starts here. Discover what’s happening with the clubs that make CMU, CMU.</p>
            <a className="explore-link" href="#events">Find your next thing <span aria-hidden="true">↘</span></a>
          </div>
          <div className="hero-art" aria-hidden="true">
            <div className="orbit orbit-one" /><div className="orbit orbit-two" />
            <div className="ticket-art"><span className="ticket-top">TARTAN TICKETS <span>✳</span></span><span className="ticket-title">You had<br />to be there.</span><span className="ticket-bottom">CAMPUS MOMENTS, TOGETHER.<span>|||| ||| || ||||</span></span></div>
            <span className="art-star">✳</span><span className="art-note">A little less scrolling.<br />A little more showing up.</span>
          </div>
        </section>
        <EventBrowser initialEvents={listPublicEvents()} />
      </main>
      <footer><a className="footer-brand" href="/">tartan tickets.</a><span>Made for the moments between classes.</span><span>Story 1 · Browse events demo</span></footer>
    </>
  );
}
