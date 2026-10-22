import './globals.css';

export const metadata = {
  title: 'Tartan Tickets | Find your next campus moment',
  description: 'Discover upcoming student club events at Carnegie Mellon.',
};

export default function RootLayout({ children }) {
  return <html lang="en"><body>{children}</body></html>;
}
