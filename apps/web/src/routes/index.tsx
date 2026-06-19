import { useEffect } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: LandingPage,
})

const display = "[font-family:var(--font-display)] font-black uppercase tracking-[-0.025em] leading-[0.88]"
const gradText = "bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] bg-clip-text text-transparent"

function QueueItem({ platform, platformClass, time, content, statusLabel, statusClass, live = false }: {
  platform: string; platformClass: string; time: string; content: string;
  statusLabel: string; statusClass: string; live?: boolean;
}) {
  return (
    <div className={[
      "grid grid-cols-[32px_1fr_auto] gap-[11px] items-start rounded-[10px] p-[11px_13px] transition-colors",
      "bg-white/[0.025]",
      live
        ? "border border-[rgba(173,255,47,0.32)] shadow-[0_0_22px_rgba(173,255,47,0.05)]"
        : "border border-white/[0.055] hover:border-[rgba(139,92,246,0.3)]",
    ].join(' ')}>
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[0.65rem] font-black text-white shrink-0 ${platformClass}`}>
        {platform}
      </div>
      <div>
        <div className="text-[0.69rem] text-[#4A4370] mb-[3px]">{time}</div>
        <div className="text-[0.81rem] text-[#F0EEF8] leading-[1.38] line-clamp-2">{content}</div>
      </div>
      <span className={`px-[9px] py-[3px] rounded-full text-[0.65rem] font-black whitespace-nowrap shrink-0 tracking-[0.04em] ${statusClass}`}>
        {statusLabel}
      </span>
    </div>
  )
}

function FeatureCard({ icon, iconBg, title, desc, delay = '' }: {
  icon: string; iconBg: string; title: string; desc: string; delay?: string;
}) {
  return (
    <div
      className="rv bg-[#0F0D22] border border-[rgba(139,92,246,0.18)] rounded-[20px] p-[clamp(1.5rem,2.5vw,2.25rem)] transition-all duration-300 hover:-translate-y-1 hover:border-[rgba(139,92,246,0.42)] hover:shadow-[0_20px_60px_rgba(0,0,0,0.35)]"
      style={{ transitionDelay: delay }}
    >
      <div className={`w-[46px] h-[46px] rounded-[11px] flex items-center justify-center text-[1.35rem] mb-5 ${iconBg}`}>{icon}</div>
      <h3 className="text-[1.05rem] font-bold mb-[0.55rem] tracking-[-0.01em]">{title}</h3>
      <p className="text-[0.88rem] text-[#9B8FCC] leading-[1.68]">{desc}</p>
    </div>
  )
}

function PricingCard({ name, price, period, cta, ctaHref, ctaStyle, features, featured = false, delay = '' }: {
  name: string; price: string; period: string; cta: string; ctaHref: string;
  ctaStyle: 'lime' | 'border'; features: string[]; featured?: boolean; delay?: string;
}) {
  const btnCls = ctaStyle === 'lime'
    ? "bg-[#ADFF2F] text-[#080808]"
    : "border border-[rgba(139,92,246,0.42)] text-[#F0EEF8]"

  return (
    <div
      className={[
        "rv relative rounded-[20px] p-8 transition-all duration-200",
        featured
          ? "border border-[rgba(139,92,246,0.42)] bg-[#13112B] scale-[1.03] hover:scale-[1.04]"
          : "border border-[rgba(139,92,246,0.18)] bg-[#0F0D22] hover:border-[rgba(139,92,246,0.42)]",
      ].join(' ')}
      style={{ transitionDelay: delay }}
    >
      {featured && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] text-white text-[0.7rem] font-black tracking-[0.07em] uppercase px-[14px] py-1 rounded-full whitespace-nowrap">
          Most popular
        </div>
      )}
      <p className="text-[0.75rem] font-black tracking-[0.1em] uppercase text-[#4A4370] mb-4">{name}</p>
      <div className="[font-family:var(--font-display)] font-black text-[2.8rem] tracking-[-0.04em] leading-none mb-[0.3rem]">{price}</div>
      <p className="text-[0.82rem] text-[#9B8FCC] mb-7">{period}</p>
      {ctaHref.startsWith('/') ? (
        <Link to={ctaHref as '/register'} className={`block text-center py-[11px] px-5 rounded-lg text-[0.88rem] font-black mb-7 transition-all hover:opacity-85 hover:-translate-y-px no-underline ${btnCls}`}>{cta}</Link>
      ) : (
        <a href={ctaHref} className={`block text-center py-[11px] px-5 rounded-lg text-[0.88rem] font-black mb-7 transition-all hover:opacity-85 hover:-translate-y-px no-underline ${btnCls}`}>{cta}</a>
      )}
      <ul className="list-none flex flex-col gap-[0.65rem]">
        {features.map((f) => (
          <li key={f} className="text-[0.86rem] text-[#9B8FCC] flex items-start gap-[10px] leading-[1.4]">
            <span className="text-[#8B5CF6] font-black shrink-0">✓</span>{f}
          </li>
        ))}
      </ul>
    </div>
  )
}

export function LandingPage() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add('in'); observer.unobserve(e.target) }
      }),
      { threshold: 0.1, rootMargin: '0px 0px -32px 0px' }
    )
    document.querySelectorAll('.rv').forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  return (
    <div className="bg-[#070712] text-[#F0EEF8] min-h-screen overflow-x-clip font-sans">

      {/* Reveal styles */}
      <style>{`.rv{opacity:0;transform:translateY(22px);transition:opacity .55s ease,transform .55s ease}.rv.in{opacity:1;transform:none}@media(prefers-reduced-motion:reduce){.rv{opacity:1;transform:none;transition:none}}`}</style>

      {/* NAV */}
      <nav className="sticky top-0 z-[100] flex items-center justify-between px-[clamp(1.5rem,5vw,4rem)] h-16 bg-[rgba(7,7,18,0.82)] backdrop-blur-xl border-b border-[rgba(139,92,246,0.18)]">
        <a href="/" className="flex items-center gap-[9px] no-underline text-[#F0EEF8] font-bold text-[1.05rem] tracking-[-0.01em]">
          <span className="w-[30px] h-[30px] rounded-[7px] bg-gradient-to-br from-[#8B5CF6] to-[#EC4899] flex items-center justify-center font-black text-[0.9rem] text-white">P</span>
          PostPilot
        </a>
        <ul className="list-none flex items-center gap-[clamp(0.8rem,2vw,1.75rem)]">
          <li className="hidden sm:block"><a href="#features" className="no-underline text-[#9B8FCC] text-[0.88rem] hover:text-[#F0EEF8] transition-colors">Features</a></li>
          <li className="hidden sm:block"><a href="#pricing" className="no-underline text-[#9B8FCC] text-[0.88rem] hover:text-[#F0EEF8] transition-colors">Pricing</a></li>
          <li><Link to="/login" className="no-underline text-[#9B8FCC] text-[0.88rem] hover:text-[#F0EEF8] transition-colors">Sign in</Link></li>
          <li><Link to="/register" className="no-underline bg-[#ADFF2F] text-[#080808] font-black text-[0.82rem] px-[15px] py-[7px] rounded-[6px] tracking-[0.01em] hover:opacity-85 transition-opacity">Get started</Link></li>
        </ul>
      </nav>

      {/* HERO */}
      <section className="relative grid grid-cols-1 md:grid-cols-2 items-center gap-12 min-h-[88vh] px-[clamp(1.5rem,5vw,4rem)] py-[clamp(4rem,9vh,7rem)] overflow-hidden">
        <div className="absolute inset-[-25%] pointer-events-none [animation:lp-breathe_11s_ease-in-out_infinite_alternate]"
          style={{ background: 'radial-gradient(ellipse 70% 55% at 75% 45%, rgba(139,92,246,0.13) 0%, transparent 65%), radial-gradient(ellipse 50% 70% at 20% 65%, rgba(236,72,153,0.07) 0%, transparent 65%)' }} />

        <div className="relative">
          <div className="[animation:lp-up_0.5s_0.08s_both_ease-out] inline-flex items-center gap-[9px] bg-[rgba(173,255,47,0.07)] border border-[rgba(173,255,47,0.28)] rounded-full px-[14px] py-[6px] text-[0.78rem] font-bold text-[#ADFF2F] tracking-[0.025em] mb-9">
            <span className="w-2 h-2 rounded-full bg-[#ADFF2F] shrink-0 [animation:lp-blink_1.9s_ease-in-out_infinite]" />
            50,000+ creators scheduling live
          </div>
          <h1 className={`[animation:lp-up_0.55s_0.18s_both_ease-out] ${display} text-[clamp(3.2rem,6.2vw,5.8rem)] mb-7`}>
            <span className="block">Your Content.</span>
            <span className="block">Every Platform.</span>
            <span className={`block ${gradText}`}>Zero Chaos.</span>
          </h1>
          <p className="[animation:lp-up_0.55s_0.3s_both_ease-out] text-[clamp(0.98rem,1.25vw,1.15rem)] text-[#9B8FCC] max-w-[44ch] leading-[1.72] mb-10">
            Schedule once, post everywhere. PostPilot handles Instagram, YouTube, LinkedIn, X, and Facebook — so you stay locked in create mode.
          </p>
          <div className="[animation:lp-up_0.55s_0.4s_both_ease-out] flex items-center gap-4 flex-wrap">
            <Link to="/register" className="no-underline inline-flex items-center bg-[#ADFF2F] text-[#080808] font-black text-[0.94rem] px-7 py-[14px] rounded-lg tracking-[0.01em] transition-all hover:-translate-y-0.5 hover:shadow-[0_10px_36px_rgba(173,255,47,0.28)]">
              Start scheduling free
            </Link>
            <a href="#features" className="no-underline inline-flex items-center text-[#9B8FCC] text-[0.94rem] font-medium py-[14px] hover:text-[#F0EEF8] transition-colors">
              See how it works →
            </a>
          </div>
        </div>

        <div className="[animation:lp-up_0.65s_0.25s_both_ease-out] order-first md:order-none">
          <div className="bg-[rgba(15,13,34,0.75)] backdrop-blur-[28px] border border-[rgba(139,92,246,0.42)] rounded-[20px] p-6 shadow-[0_0_90px_rgba(139,92,246,0.12),inset_0_1px_0_rgba(255,255,255,0.05)] flex flex-col gap-[0.7rem]">
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.05] mb-[0.15rem]">
              <span className="text-[0.72rem] font-black tracking-[0.1em] uppercase text-[#4A4370]">Content Queue</span>
              <span className="text-[0.75rem] text-[#4A4370]">Mon, 19 Jun</span>
            </div>
            <QueueItem platform="IG" platformClass="[background:linear-gradient(135deg,#F09433,#DC2743,#BC1888)]" time="Today · 9:00 AM" content={'"new collection just landed and honestly? the quality slaps 🔥 link in bio"'} statusLabel="Posted ✓" statusClass="bg-[rgba(52,211,153,0.14)] text-[#34D399]" live />
            <QueueItem platform="▶" platformClass="bg-[#FF2D55]" time="Today · 12:00 PM" content={'"I tried every productivity hack for 30 days. Here\'s what actually worked"'} statusLabel="Scheduled" statusClass="bg-[rgba(139,92,246,0.16)] text-[#A78BFA]" />
            <QueueItem platform="in" platformClass="bg-[#0A66C2]" time="Today · 5:30 PM" content={'"The mistake that 3× my client rate. Most creators skip this conversation."'} statusLabel="Scheduled" statusClass="bg-[rgba(139,92,246,0.16)] text-[#A78BFA]" />
            <QueueItem platform="𝕏" platformClass="bg-[#1A1A28] border border-white/10 text-[0.85rem]" time="Tomorrow · 10:00 AM" content={'"posting frequency matters less than content clarity. unpopular opinion 🧵"'} statusLabel="Draft" statusClass="bg-white/[0.06] text-[#4A4370]" />
          </div>
        </div>
      </section>

      {/* PLATFORMS */}
      <div className="border-t border-b border-[rgba(139,92,246,0.18)] py-10 px-[clamp(1.5rem,5vw,4rem)]">
        <p className="text-center text-[0.75rem] font-black tracking-[0.1em] uppercase text-[#4A4370] mb-7">Schedule to every platform you already use</p>
        <div className="flex items-center justify-center gap-[clamp(1.5rem,4vw,3.5rem)] flex-wrap">
          {[
            { label: 'Instagram', color: 'linear-gradient(135deg,#F09433,#DC2743,#BC1888)' },
            { label: 'YouTube',   color: '#FF2D55' },
            { label: 'LinkedIn',  color: '#0A66C2' },
            { label: 'X (Twitter)', color: '#888' },
            { label: 'Facebook',  color: '#1877F2' },
          ].map(({ label, color }) => (
            <div key={label} className="flex items-center gap-2 text-[0.88rem] font-semibold text-[#9B8FCC] hover:text-[#F0EEF8] transition-colors">
              <span className="w-[10px] h-[10px] rounded-full shrink-0" style={{ background: color }} />
              {label}
            </div>
          ))}
        </div>
      </div>

      {/* FEATURES */}
      <section className="px-[clamp(1.5rem,5vw,4rem)] py-[clamp(4.5rem,9vh,8rem)]" id="features">
        <p className="text-[0.75rem] font-black tracking-[0.12em] uppercase text-[#8B5CF6] mb-[0.85rem]">What PostPilot does</p>
        <h2 className={`rv ${display} text-[clamp(1.9rem,3.2vw,2.9rem)] mb-14 max-w-[30ch]`}>Built for creators<br />serious about growth</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <FeatureCard icon="📅" iconBg="bg-[rgba(139,92,246,0.15)]" title="Schedule everywhere, once" desc="Write it once. Pick your platforms. Set the time. PostPilot pushes the same post across every channel simultaneously." />
          <FeatureCard icon="📊" iconBg="bg-[rgba(236,72,153,0.12)]" title="Analytics that actually matter" desc="Engagement rate, reach, best posting windows — not vanity counts. See what lands, understand why, and double down on it." delay="0.1s" />
          <FeatureCard icon="✅" iconBg="bg-[rgba(173,255,47,0.1)]" title="Agency approval workflow" desc="Client needs sign-off before anything goes live? Set up approver roles, collect the green light, then publish — no email threads." delay="0.2s" />
        </div>
      </section>

      {/* STATS */}
      <div className="rv bg-[#0F0D22] border-t border-b border-[rgba(139,92,246,0.18)] grid grid-cols-2 md:grid-cols-4 gap-8 px-[clamp(1.5rem,5vw,4rem)] py-[clamp(3rem,6vh,5rem)] text-center">
        {[['50K+','Active creators'],['2M+','Posts scheduled'],['97%','On-time delivery'],['5','Platforms supported']].map(([n, l]) => (
          <div key={l}>
            <div className={`[font-family:var(--font-display)] font-black text-[clamp(2.5rem,4vw,3.8rem)] tracking-[-0.04em] leading-none mb-[0.45rem] ${gradText}`}>{n}</div>
            <div className="text-[0.85rem] text-[#9B8FCC] font-medium">{l}</div>
          </div>
        ))}
      </div>

      {/* PRICING */}
      <section className="px-[clamp(1.5rem,5vw,4rem)] py-[clamp(4.5rem,9vh,8rem)]" id="pricing">
        <p className="text-[0.75rem] font-black tracking-[0.12em] uppercase text-[#8B5CF6] mb-[0.85rem]">Pricing</p>
        <h2 className={`rv ${display} text-[clamp(1.9rem,3.2vw,2.9rem)] mb-14 max-w-[30ch]`}>Pay for reach,<br />not for posting</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          <PricingCard name="Free" price="₹0" period="forever — no card needed" cta="Start for free" ctaHref="/register" ctaStyle="border" features={['2 social accounts','50 scheduled posts / month','7-day analytics history','Hashtag helper','Media upload & deduplication']} />
          <PricingCard name="Pro" price="₹999" period="/ month · billed monthly" cta="Start 14-day free trial" ctaHref="/register" ctaStyle="lime" featured features={['25 social accounts','Unlimited posts','90-day analytics history','Best-time recommendations','Priority publish queue','Team member access','Backfill post history import']} />
          <PricingCard name="Agency" price="₹3,999" period="/ month · billed monthly" cta="Talk to us" ctaHref="mailto:hello@postpilot.app" ctaStyle="border" delay="0.2s" features={['100 social accounts','Unlimited workspaces','365-day analytics history','Client approval workflows','Role-based access control','Admin dead-letter dashboard','Dedicated support']} />
        </div>
      </section>

      {/* CTA */}
      <div className="rv mx-[clamp(1.5rem,5vw,4rem)] mb-[clamp(4rem,8vh,7rem)] bg-[#13112B] border border-[rgba(139,92,246,0.18)] rounded-[clamp(16px,2.5vw,28px)] px-[clamp(2rem,6vw,5rem)] py-[clamp(3.5rem,8vh,6.5rem)] text-center relative overflow-hidden">
        <div className="absolute top-[-60%] left-1/2 -translate-x-1/2 w-3/4 h-full pointer-events-none" style={{ background: 'radial-gradient(ellipse 85% 65% at 50% 0%, rgba(139,92,246,0.16) 0%, transparent 70%)' }} />
        <h2 className={`relative ${display} text-[clamp(2.1rem,4vw,3.6rem)] mb-5`}>
          Your content deserves<br /><span className={gradText}>a better system.</span>
        </h2>
        <p className="relative text-[1rem] text-[#9B8FCC] max-w-[42ch] mx-auto mb-10">
          Join 50,000 creators who stopped juggling tabs and started owning their calendar.
        </p>
        <div className="relative flex items-center justify-center gap-4 flex-wrap">
          <Link to="/register" className="no-underline inline-flex items-center bg-[#ADFF2F] text-[#080808] font-black text-[0.94rem] px-7 py-[14px] rounded-lg tracking-[0.01em] transition-all hover:-translate-y-0.5 hover:shadow-[0_10px_36px_rgba(173,255,47,0.28)]">Start scheduling free</Link>
          <a href="mailto:hello@postpilot.app" className="no-underline inline-flex items-center text-[#9B8FCC] text-[0.94rem] font-medium py-[14px] hover:text-[#F0EEF8] transition-colors">Talk to our team →</a>
        </div>
        <p className="relative text-[0.75rem] text-[#4A4370] mt-4">No credit card. Cancel any time. Your data is always yours.</p>
      </div>

      {/* FOOTER */}
      <footer className="border-t border-[rgba(139,92,246,0.18)] px-[clamp(1.5rem,5vw,4rem)] py-8 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2 font-bold text-[0.95rem] text-[#F0EEF8]">
          <span className="w-[30px] h-[30px] rounded-[7px] bg-gradient-to-br from-[#8B5CF6] to-[#EC4899] flex items-center justify-center font-black text-[0.9rem] text-white">P</span>
          PostPilot
        </div>
        <div className="flex gap-6">
          <a href="#features" className="no-underline text-[0.82rem] text-[#4A4370] hover:text-[#9B8FCC] transition-colors">Features</a>
          <a href="#pricing" className="no-underline text-[0.82rem] text-[#4A4370] hover:text-[#9B8FCC] transition-colors">Pricing</a>
          <Link to="/login" className="no-underline text-[0.82rem] text-[#4A4370] hover:text-[#9B8FCC] transition-colors">Sign in</Link>
          <a href="#" className="no-underline text-[0.82rem] text-[#4A4370] hover:text-[#9B8FCC] transition-colors">Privacy</a>
        </div>
        <p className="text-[0.8rem] text-[#4A4370]">© 2026 PostPilot</p>
      </footer>

    </div>
  )
}
