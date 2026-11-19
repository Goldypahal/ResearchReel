import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy — ResearchReel',
  description: 'Digital Personal Data Protection Act (DPDP 2023) and GDPR compliant privacy policy for ResearchReel.',
};

const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'privacy@researchreel.com';

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-10 py-8 px-4">
      <header className="space-y-3 border-b border-[var(--border)] pb-6">
        <div className="flex items-center gap-2 text-sm text-zinc-400">
          <Link href="/support" className="text-indigo-400 hover:underline">Help &amp; policies</Link>
          <span>/</span>
          <span>Privacy Policy</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight">Privacy Policy</h1>
        <p className="text-sm text-zinc-400">Effective Date: November 19, 2026 · Compliant with DPDP Act 2023 &amp; GDPR</p>
      </header>

      <section className="space-y-4 text-sm text-zinc-300 leading-relaxed">
        <h2 className="text-xl font-bold text-zinc-100">1. Overview &amp; Consent</h2>
        <p>
          ResearchReel (&ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;) is committed to protecting your personal data and upholding your digital privacy.
          This Privacy Policy describes how we collect, process, store, and safeguard your personal information in compliance with India&apos;s
          <strong> Digital Personal Data Protection (DPDP) Act, 2023</strong> and the <strong>EU General Data Protection Regulation (GDPR)</strong>.
        </p>
        <p>
          By creating an account or using ResearchReel, you grant free, specific, informed, and unambiguous consent to the data practices described herein.
        </p>
      </section>

      <section className="space-y-4 text-sm text-zinc-300 leading-relaxed">
        <h2 className="text-xl font-bold text-zinc-100">2. Information We Collect</h2>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Identity &amp; Profile Data:</strong> Email address, username, hashed password (using argon2), full name, bio, profile image, and institution affiliation.</li>
          <li><strong>Academic Credentials:</strong> ORCID identifier and verification tokens if you choose to connect your academic identity.</li>
          <li><strong>Content &amp; Documents:</strong> Research papers (PDF/DOCX), presentation reels, generated summaries, comments, likes, and bookmarks.</li>
          <li><strong>Technical &amp; Telemetry Data:</strong> IP address, device type, browser user-agent, operating system, and security logs (failed login tracking, rate-limiting tokens).</li>
        </ul>
      </section>

      <section className="space-y-4 text-sm text-zinc-300 leading-relaxed">
        <h2 className="text-xl font-bold text-zinc-100">3. Artificial Intelligence &amp; Third-Party Processors</h2>
        <p>
          To generate paper summaries, answer semantic questions, and draft reel scripts, we utilize external AI models:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Google Gemini (Alphabet Inc.):</strong> Text passages and queries are sent to Google Gemini APIs to generate citations and syntheses. Google does not use customer data sent via enterprise APIs to train its foundation models.</li>
          <li><strong>Cloud Infrastructure:</strong> Managed servers and databases are hosted on Render, with persistent object files stored in Cloudflare R2 (encrypted at rest).</li>
          <li><strong>Transactional Email:</strong> Verification codes, security alerts, and notifications are securely delivered via Resend or authenticated SMTP.</li>
        </ul>
      </section>

      <section className="space-y-4 text-sm text-zinc-300 leading-relaxed">
        <h2 className="text-xl font-bold text-zinc-100">4. Embedded YouTube Content (Research Picks)</h2>
        <p>
          When you preview or watch videos in <em>Research Picks</em>, the player is loaded directly from YouTube&apos;s embedded service.
          As a result, YouTube and Google may collect viewing telemetry, IP addresses, and cookie identifiers in accordance with the
          <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-indigo-400 underline ml-1">Google Privacy Policy</a>.
          ResearchReel does not share your platform user identity or private account details with YouTube.
        </p>
      </section>

      <section className="space-y-4 text-sm text-zinc-300 leading-relaxed">
        <h2 className="text-xl font-bold text-zinc-100">5. Data Retention &amp; Account Deletion</h2>
        <p>
          We retain your personal data only as long as your account remains active or as required by law for security compliance.
        </p>
        <div className="rounded-xl border border-zinc-700 bg-zinc-800/40 p-4 space-y-2">
          <h3 className="font-semibold text-zinc-200">How to Delete Your Account</h3>
          <p className="text-xs text-zinc-400 leading-relaxed">
            You can permanently delete your account at any time by navigating to <strong>Settings &rarr; Security &rarr; Delete Account</strong>.
            Upon confirmation, your profile, sessions, documents, and reels are immediately queued for irreversible erasure from all active databases and object buckets.
          </p>
        </div>
      </section>

      <section className="space-y-4 text-sm text-zinc-300 leading-relaxed">
        <h2 className="text-xl font-bold text-zinc-100">6. Your Rights as a Data Principal</h2>
        <p>Under the DPDP Act 2023 and GDPR, you have the right to:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Access:</strong> Request a copy of your personal data held by us.</li>
          <li><strong>Correction &amp; Erasure:</strong> Rectify inaccurate personal data or request immediate deletion.</li>
          <li><strong>Consent Withdrawal:</strong> Revoke consent for non-essential processing at any time.</li>
          <li><strong>Grievance Redressal:</strong> File a inquiry or grievance with our designated data protection officer.</li>
        </ul>
      </section>

      <section className="space-y-4 text-sm text-zinc-300 leading-relaxed">
        <h2 className="text-xl font-bold text-zinc-100">7. Data Protection Officer &amp; Grievance Redressal</h2>
        <p>
          In accordance with the Digital Personal Data Protection Act, 2023, for questions, requests, or grievances regarding your data, please contact:
        </p>
        <div className="rounded-xl border border-[var(--border)] p-4 text-xs space-y-1 text-zinc-300">
          <p><strong>Grievance Officer:</strong> Data Protection Team</p>
          <p><strong>Email:</strong> <a href={`mailto:${SUPPORT_EMAIL}`} className="text-indigo-400">{SUPPORT_EMAIL}</a></p>
          <p><strong>Response Time:</strong> Inquiries are acknowledged within 24 hours and addressed within 7 business days.</p>
        </div>
      </section>

      <footer className="pt-6 border-t border-[var(--border)] text-xs text-zinc-500 flex justify-between">
        <Link href="/terms" className="text-indigo-400 hover:underline">Read Terms of Service &rarr;</Link>
        <Link href="/support" className="text-zinc-400 hover:underline">Help &amp; Support</Link>
      </footer>
    </div>
  );
}
