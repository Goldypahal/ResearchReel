import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Terms of Service — ResearchReel',
  description: 'Terms of Service, acceptable use policy, publisher copyright takedown procedure, and embedded content terms for ResearchReel.',
};

const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'support@researchreel.com';

export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-10 py-8 px-4">
      <header className="space-y-3 border-b border-[var(--border)] pb-6">
        <div className="flex items-center gap-2 text-sm text-zinc-400">
          <Link href="/support" className="text-indigo-400 hover:underline">Help &amp; policies</Link>
          <span>/</span>
          <span>Terms of Service</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight">Terms of Service</h1>
        <p className="text-sm text-zinc-400">Effective Date: November 19, 2026 · Last Updated: November 19, 2026</p>
      </header>

      <section className="space-y-4 text-sm text-zinc-300 leading-relaxed">
        <h2 className="text-xl font-bold text-zinc-100">1. Acceptance of Terms</h2>
        <p>
          Welcome to ResearchReel (&ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;us&rdquo;). By accessing or using our website, services,
          APIs, and mobile interfaces (the &ldquo;Service&rdquo;), you agree to comply with and be bound by these Terms of Service
          (&ldquo;Terms&rdquo;) and our <Link href="/privacy" className="text-indigo-400 underline">Privacy Policy</Link>. If you do not agree to these Terms, you may not use our Service.
        </p>
        <p>
          By creating an account, you confirm that you are at least 18 years of age (or the age of legal majority in your jurisdiction)
          and possess the legal authority to enter into these Terms.
        </p>
      </section>

      <section className="space-y-4 text-sm text-zinc-300 leading-relaxed">
        <h2 className="text-xl font-bold text-zinc-100">2. User Accounts &amp; Academic Integrity</h2>
        <p>
          You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.
          You agree to provide true, accurate, and complete registration information.
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Academic Verification:</strong> Researcher badges and affiliation tags verified via ORCID or institutional email are verified on an as-is basis. Misrepresenting credentials or institutional affiliations may lead to immediate suspension.</li>
          <li><strong>Integrity:</strong> ResearchReel is dedicated to verified scholarship. Plagiarism, fabricated data, or misrepresenting author contributions is strictly prohibited.</li>
        </ul>
      </section>

      <section className="space-y-4 text-sm text-zinc-300 leading-relaxed">
        <h2 className="text-xl font-bold text-zinc-100">3. User Content &amp; Publisher Copyright</h2>
        <p>
          You retain copyright and ownership in the original research papers, drafts, summaries, comments, and video reels you upload to ResearchReel.
          By submitting User Content, you grant ResearchReel a non-exclusive, worldwide, royalty-free license to host, parse, cache, index, and display your content solely for providing the Service.
        </p>
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-2">
          <h3 className="font-semibold text-amber-200">Publisher Copyright Notice</h3>
          <p className="text-xs text-amber-300/90 leading-relaxed">
            Many academic journal publishers retain exclusive copyright over final published PDF versions. You warrant that you only upload pre-prints, author-accepted manuscripts (AAM), or open-access (Creative Commons) works that you have the legal right or license to share publicly.
          </p>
        </div>
      </section>

      <section className="space-y-4 text-sm text-zinc-300 leading-relaxed">
        <h2 className="text-xl font-bold text-zinc-100">4. Copyright Takedowns &amp; DMCA Contact</h2>
        <p>
          We respect intellectual property rights and respond promptly to notices of alleged copyright infringement in accordance with applicable laws (including India&apos;s Copyright Act and the U.S. DMCA).
        </p>
        <p>
          If you are a copyright owner or an authorized agent and believe content on ResearchReel infringes your copyright, please submit a formal takedown request containing:
        </p>
        <ol className="list-decimal pl-5 space-y-1">
          <li>Identification of the copyrighted work claimed to have been infringed.</li>
          <li>The exact URL or identifier of the allegedly infringing material on ResearchReel.</li>
          <li>Your contact information (name, address, telephone number, and email).</li>
          <li>A statement of good faith belief that the disputed use is not authorized by the copyright owner.</li>
          <li>A statement made under penalty of perjury that the information in the notification is accurate and that you are authorized to act.</li>
        </ol>
        <p className="mt-2">
          Send copyright notices to our designated agent at:{' '}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="text-indigo-400 font-semibold">{SUPPORT_EMAIL}</a> with the subject line <code className="bg-zinc-800 px-1 py-0.5 rounded">&ldquo;Copyright Takedown Notice&rdquo;</code>. We aim to review and process verified notices within 48 hours.
        </p>
      </section>

      <section className="space-y-4 text-sm text-zinc-300 leading-relaxed">
        <h2 className="text-xl font-bold text-zinc-100">5. Embedded Content &amp; Research Picks</h2>
        <p>
          ResearchReel features curated academic talks, conference presentations, and lectures (&ldquo;Research Picks&rdquo;) streamed via YouTube&apos;s embedded player API.
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>All embedded videos remain the intellectual property of their respective creators and channels.</li>
          <li>Embedded playback operates under <a href="https://www.youtube.com/t/terms" target="_blank" rel="noopener noreferrer" className="text-indigo-400 underline">YouTube&apos;s Terms of Service</a>.</li>
          <li>If you are a content creator or channel owner and wish to have your video excluded from Research Picks, you can click the &ldquo;Report&rdquo; button or contact us at <a href={`mailto:${SUPPORT_EMAIL}`} className="text-indigo-400">{SUPPORT_EMAIL}</a>, and we will promptly remove it from our feed.</li>
        </ul>
      </section>

      <section className="space-y-4 text-sm text-zinc-300 leading-relaxed">
        <h2 className="text-xl font-bold text-zinc-100">6. AI Processing &amp; Limitations</h2>
        <p>
          ResearchReel offers automated paper summaries, multi-paper research synthesis, and reel script drafting powered by Google Gemini and vector retrieval models.
        </p>
        <p>
          While summaries are grounded in the uploaded document text, AI outputs may occasionally contain inaccuracies, hallucinations, or incomplete context. AI-generated insights are provided solely as research aids and should never be used as a substitute for reading original peer-reviewed source literature.
        </p>
      </section>

      <section className="space-y-4 text-sm text-zinc-300 leading-relaxed">
        <h2 className="text-xl font-bold text-zinc-100">7. Prohibited Uses</h2>
        <p>You agree not to:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Upload viruses, malware, or exploit files (all uploads are subjected to automated scanning).</li>
          <li>Circumvent or attempt to circumvent rate limits, access controls, or security perimeters.</li>
          <li>Scrape, index, or harvest user data using automated bots without explicit written consent.</li>
          <li>Harass, intimidate, defame, or discriminate against other scholars.</li>
        </ul>
      </section>

      <section className="space-y-4 text-sm text-zinc-300 leading-relaxed">
        <h2 className="text-xl font-bold text-zinc-100">8. Governing Law &amp; Dispute Resolution</h2>
        <p>
          These Terms are governed by and construed in accordance with the laws of India, including the Digital Personal Data Protection (DPDP) Act, 2023 and the Information Technology Act, 2000, without regard to conflict of law principles.
        </p>
      </section>

      <footer className="pt-6 border-t border-[var(--border)] text-xs text-zinc-500 flex justify-between">
        <Link href="/privacy" className="text-indigo-400 hover:underline">Read Privacy Policy &rarr;</Link>
        <Link href="/support" className="text-zinc-400 hover:underline">Help &amp; Support</Link>
      </footer>
    </div>
  );
}
