import type { Metadata } from 'next';
import Link from 'next/link';
import { LifeBuoy, ShieldCheck, FileText, Lock, Mail, ChevronDown } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Help & policies · ResearchReel',
  description: 'Answers to common questions, community guidelines, terms of service and privacy policy.',
};

const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL;
const POLICY_DATE = 'July 1, 2026';

type QA = { q: string; a: React.ReactNode };

const FAQ: { title: string; items: QA[] }[] = [
  {
    title: 'Getting started',
    items: [
      { q: 'What is ResearchReel?', a: 'A place for researchers, professors and students to share work as short video reels and posts, read papers with an AI assistant, and collaborate in projects.' },
      { q: 'How do I create an account?', a: <>Go to <Link href="/auth/register">Create account</Link>, enter your name, a username, your email and a password, then type in the 6-digit code we email you. Codes expire after 10 minutes; use &ldquo;Resend code&rdquo; if yours has.</> },
      { q: 'I forgot my password.', a: <>Use <Link href="/auth/forget-password">Reset password</Link>. We email a 6-digit code (valid for 15 minutes); after you choose a new password you are signed out on every device.</> },
    ],
  },
  {
    title: 'Verification badges',
    items: [
      { q: 'How do I get the verified student badge?', a: <>In <Link href="/settings?tab=verification">Settings → Verification</Link>, enter your university email address and confirm the code we send to it.</> },
      { q: 'How do I get the verified scholar badge?', a: <>Connect your ORCID iD in <Link href="/settings?tab=verification">Settings → Verification</Link>. You can disconnect it at any time from the same page.</> },
    ],
  },
  {
    title: 'Papers & AI',
    items: [
      { q: 'Which files can I upload?', a: 'PDF and DOCX papers up to 50 MB. ResearchReel extracts the title, abstract and DOI so the paper is searchable and ready for the AI assistant.' },
      { q: 'How does Ask AI work?', a: <>Open <Link href="/ai">AI Research</Link> or a paper in your library and ask a question. Answers are grounded in the papers you choose and cite the passages they come from. AI can make mistakes, so check important details against the paper.</> },
      { q: 'Can I import my publications by DOI?', a: 'Yes. On your profile, choose Add publications and paste DOIs (or your ORCID iD); the details are fetched from Crossref and shared as posts.' },
    ],
  },
  {
    title: 'Reels & posts',
    items: [
      { q: 'What are the limits for video reels?', a: 'Reels must be 30–60 seconds long and at most 200 MB (MP4 or MOV). Posts can include up to 4 images of up to 10 MB each.' },
      { q: 'Can ResearchReel make a reel from my paper?', a: <>Yes. <Link href="/reels/create">Create a reel</Link> drafts a script and scenes from one of your papers. Review and edit the draft before publishing; nothing is posted automatically unless you turn on scheduled uploads.</> },
    ],
  },
  {
    title: 'Account & security',
    items: [
      { q: 'How do I see where I am signed in?', a: <><Link href="/settings?tab=security">Settings → Security</Link> lists your active sessions. You can sign out any of them, or every session except the current one.</> },
      { q: 'How do I delete my account?', a: <>In <Link href="/settings?tab=security">Settings → Security</Link>. Your profile details are erased and your posts and papers are removed; you are signed out everywhere.</> },
      { q: 'Are uploads checked for malware?', a: 'Every upload (papers, images, profile photos and videos) is checked by our malware scanner before it is stored. Files that fail the scan are rejected and deleted.' },
    ],
  },
];

function Section({ id, icon: Icon, title, children }: { id: string; icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 rounded-2xl border border-border bg-card p-6 md:p-8">
      <h2 className="mb-5 flex items-center gap-2 text-xl font-bold"><Icon size={20} className="text-primary" /> {title}</h2>
      {children}
    </section>
  );
}

const prose = 'space-y-4 text-sm leading-relaxed text-muted-foreground [&_h3]:mt-6 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-foreground [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5 [&_a]:text-primary [&_a]:underline [&_strong]:text-foreground';

export default function SupportPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-16">
      <header>
        <h1 className="flex items-center gap-2 text-3xl font-extrabold tracking-tight"><LifeBuoy size={26} className="text-primary" /> Help & policies</h1>
        <p className="mt-2 text-muted-foreground">Answers to common questions and the rules that keep ResearchReel useful for everyone.</p>
        <nav className="mt-4 flex flex-wrap gap-2 text-sm">
          {[['#faq', 'FAQ'], ['#guidelines', 'Community guidelines'], ['#terms', 'Terms of service'], ['#privacy', 'Privacy policy'], ['#contact', 'Contact']].map(([href, label]) => (
            <a key={href} href={href} className="rounded-full border border-border px-3 py-1 hover:bg-muted">{label}</a>
          ))}
        </nav>
      </header>

      <Section id="faq" icon={LifeBuoy} title="Frequently asked questions">
        <div className="space-y-8">
          {FAQ.map((group) => (
            <div key={group.title}>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{group.title}</h3>
              <div className="divide-y divide-border rounded-xl border border-border">
                {group.items.map((item) => (
                  <details key={item.q} className="group px-4 [&_a]:text-primary [&_a]:underline">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-3 font-medium">
                      {item.q}
                      <ChevronDown size={16} className="shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
                    </summary>
                    <div className="pb-4 text-sm leading-relaxed text-muted-foreground">{item.a}</div>
                  </details>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section id="guidelines" icon={ShieldCheck} title="Community guidelines">
        <div className={prose}>
          <p>ResearchReel is for scientific, academic and professional research. Keep it accurate, relevant and respectful.</p>
          <h3>Not allowed</h3>
          <ul>
            <li><strong>Academic dishonesty:</strong> plagiarism, paper-mill work, fabricated results or invented citations.</li>
            <li><strong>Harassment:</strong> hate speech, personal attacks or targeted abuse of other researchers. Critique the work, not the person.</li>
            <li><strong>Off-topic or harmful media:</strong> advertising and spam, violence, or sexually explicit content.</li>
            <li><strong>Malicious files:</strong> executables, scripts or anything containing malware.</li>
          </ul>
          <h3>Reporting</h3>
          <p>Use <strong>Report</strong> on any post, choose a reason and add details. Reports go to our moderators, who can dismiss the report, remove the content, or restrict the account.</p>
          <h3>Appeals</h3>
          <p>If your content was removed or your account restricted, contact us{SUPPORT_EMAIL ? <> at <a href={`mailto:${SUPPORT_EMAIL}?subject=Moderation%20appeal`}>{SUPPORT_EMAIL}</a></> : ' using the details below'} with the post link and why you think the decision should change.</p>
        </div>
      </Section>

      <Section id="terms" icon={FileText} title="Terms of service">
        <div className={prose}>
          <p className="text-xs">Last updated {POLICY_DATE}</p>
          <h3>1. Using ResearchReel</h3>
          <p>By using ResearchReel you agree to these terms and our privacy policy. You must be at least 18, or the age of majority where you live, and the information you give us must be accurate.</p>
          <h3>2. Your account</h3>
          <ul>
            <li>Keep your password secure and tell us promptly about any unauthorised access.</li>
            <li>Verification badges must reflect credentials you actually hold.</li>
          </ul>
          <h3>3. Your content</h3>
          <p>You keep ownership of the papers, videos and posts you upload. By posting, you give ResearchReel a worldwide, non-exclusive, royalty-free licence to host, display and distribute that content on the service. Only upload work you own or have the rights to share, and follow the community guidelines.</p>
          <h3>4. Things you may not do</h3>
          <ul>
            <li>Send spam, advertising or unsolicited commercial messages.</li>
            <li>Upload malware or try to disrupt or gain unauthorised access to the service.</li>
            <li>Scrape the service or reverse engineer it.</li>
          </ul>
          <h3>5. AI features</h3>
          <p>AI summaries, answers and reel drafts are generated automatically and may contain errors. You are responsible for checking anything you publish.</p>
          <h3>6. Liability</h3>
          <p>To the extent permitted by law, ResearchReel is not liable for indirect, incidental, special, consequential or punitive damages, or for lost profits or revenue.</p>
          <h3>7. Governing law</h3>
          <p>These terms are governed by the laws of India, without regard to conflict-of-law principles.</p>
        </div>
      </Section>

      <Section id="privacy" icon={Lock} title="Privacy policy">
        <div className={prose}>
          <p className="text-xs">Last updated {POLICY_DATE}</p>
          <p>This policy explains what personal data we process and why, in line with India&apos;s Digital Personal Data Protection Act, 2023.</p>
          <h3>What we collect</h3>
          <ul>
            <li><strong>Account:</strong> email, username, full name, password (stored only as an Argon2 hash), bio and profile photo.</li>
            <li><strong>Verification:</strong> ORCID iD, and the university email you confirm for the student badge.</li>
            <li><strong>Content:</strong> papers, videos, posts, comments, messages and AI questions you submit.</li>
            <li><strong>Usage and device data:</strong> IP address, browser, device name, pages viewed and sign-in times (used for security and the active-sessions list).</li>
          </ul>
          <h3>Why we use it</h3>
          <ul>
            <li>To run the service, including search and AI features over the papers you choose.</li>
            <li>To verify badges, prevent fraud and abuse, and keep accounts secure.</li>
          </ul>
          <h3>Sharing</h3>
          <p>We do not sell personal data. We share it only with providers that help us run the service (hosting, storage, email delivery, error tracking, product analytics and AI model providers), under data-protection agreements.</p>
          <h3>Your rights</h3>
          <ul>
            <li>See and correct your details in <Link href="/settings">Settings</Link>.</li>
            <li>Delete your account at any time from Settings → Security; personal fields are erased and your content is removed.</li>
            <li>Withdraw consent or raise a grievance using the contact details below.</li>
          </ul>
          <h3>Security</h3>
          <p>Traffic is encrypted with TLS, sessions use httpOnly cookies, stored API keys are encrypted, and uploads are scanned for malware.</p>
        </div>
      </Section>

      <Section id="contact" icon={Mail} title="Contact">
        <div className={prose}>
          {SUPPORT_EMAIL ? (
            <p>Email <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> for help, moderation appeals or privacy requests, including requests to our grievance officer. We aim to reply within two working days.</p>
          ) : (
            <p>For anything not covered here, use <strong>Report</strong> on the relevant post or message an administrator. Privacy and grievance requests can be raised the same way.</p>
          )}
        </div>
      </Section>
    </div>
  );
}
