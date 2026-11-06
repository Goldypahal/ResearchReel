import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Help & policies' };

const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || '';

const FAQ: [string, string][] = [
  ['How do I verify my account?', 'Your email is verified when you sign up. To get a researcher badge, link your ORCID iD in Settings → Verification. Students can mark their account as a student account there too.'],
  ['What can I upload?', 'Posts can include text, up to 10 images (JPEG, PNG, WebP or GIF, 10 MB each) or one PDF paper (25 MB). Reels accept MP4, MOV or WebM videos between 3 seconds and 3 minutes, up to 200 MB.'],
  ['How does the reel generator work?', 'Pick one of your papers and we draft a short script from it. With AI enabled, the script is written by Gemini from the paper text; otherwise it is built from sentences in the paper. You can edit every scene before publishing. Rendering takes a minute or two and you will be notified when the reel is live.'],
  ['How accurate are the AI answers?', 'Answers about a paper are grounded in its extracted text, but AI can still make mistakes. Always check important details against the paper itself.'],
  ['Who can see my papers?', 'Public papers can be found by anyone signed in. Private papers are visible only to you and members of projects you add them to.'],
  ['How do lectures work?', 'Hosts schedule a lecture and can add a meeting link (Zoom, Meet, Teams…). The link is shown only to people who register. Each lecture has a live text discussion.'],
  ['How do I delete my account?', 'Settings → Security → Delete account. Your profile, posts and reels are removed.'],
];

export default function SupportPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-12 py-4">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">Help &amp; policies</h1>
        <p className="text-zinc-400">Answers to common questions and the rules that keep ResearchReel useful for everyone.</p>
        {SUPPORT_EMAIL && <p className="text-sm">Need help? Email <a href={`mailto:${SUPPORT_EMAIL}`} className="text-indigo-400">{SUPPORT_EMAIL}</a>.</p>}
      </header>

      <section id="faq" className="space-y-4">
        <h2 className="text-xl font-bold">Frequently asked questions</h2>
        <div className="space-y-2">
          {FAQ.map(([q, a]) => (
            <details key={q} className="rounded-xl border border-[var(--border)] p-4 group">
              <summary className="font-semibold cursor-pointer list-none flex justify-between">{q}<span className="text-zinc-500 group-open:rotate-45 transition-transform">+</span></summary>
              <p className="text-sm text-zinc-400 mt-3 leading-relaxed">{a}</p>
            </details>
          ))}
        </div>
      </section>

      <section id="guidelines" className="space-y-3">
        <h2 className="text-xl font-bold">Community guidelines</h2>
        <ul className="list-disc pl-5 space-y-2 text-sm text-zinc-300 leading-relaxed">
          <li>Share work you have the right to share. Do not upload paywalled papers or others&apos; content without permission.</li>
          <li>Represent research accurately. Do not misstate findings, fabricate data or present others&apos; work as your own.</li>
          <li>Disagree with ideas, not people. Harassment, hate speech and personal attacks are removed.</li>
          <li>No spam, scams, advertising or engagement manipulation.</li>
          <li>Report content that breaks these rules using the “Report” option. Moderators review every report; repeated violations can lead to suspension.</li>
        </ul>
      </section>

      <section id="terms" className="space-y-3">
        <h2 className="text-xl font-bold">Terms of use</h2>
        <div className="text-sm text-zinc-300 space-y-3 leading-relaxed">
          <p>By using ResearchReel you agree to follow the community guidelines and to be responsible for the content you post. You keep ownership of what you upload and grant ResearchReel a licence to host, display and distribute it on the platform so it can be shown to other users.</p>
          <p>We may remove content or suspend accounts that violate these terms. The service is provided “as is”; AI-generated summaries and answers are provided for convenience and may contain errors.</p>
        </div>
      </section>

      <section id="privacy" className="space-y-3">
        <h2 className="text-xl font-bold">Privacy</h2>
        <div className="text-sm text-zinc-300 space-y-3 leading-relaxed">
          <p>We store the information you give us (name, email, profile details, posts, papers, messages) to run the service. Your email address is never shown publicly. Passwords are stored as one-way hashes.</p>
          <p>When you use AI features, the text of the relevant paper and your question are sent to our AI provider to generate a response. We record basic usage events (such as views) to show creators how their content performs.</p>
          <p>You can edit your profile at any time and delete your account from Settings. {SUPPORT_EMAIL ? <>For other requests, contact <a href={`mailto:${SUPPORT_EMAIL}`} className="text-indigo-400">{SUPPORT_EMAIL}</a>.</> : null}</p>
        </div>
      </section>

      <p className="text-sm"><Link href="/" className="text-indigo-400">← Back to ResearchReel</Link></p>
    </div>
  );
}
