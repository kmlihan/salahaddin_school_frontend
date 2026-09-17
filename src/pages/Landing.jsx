import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { useLang } from '../context/LanguageContext';
import Logo from '../components/Logo';
import { Reveal, useScrollReveal } from '../utils/scrollReveal';
import { extractYouTubeId } from '../utils/media';

/**
 * Public landing page (v2 — animated).
 *
 * Structure:
 *   1. Hero            — animated gradient + floating blobs + decorative card
 *   2. About           — three value pillars
 *   3. Courses         — four level cards (A/B/C/D)
 *   4. Stats           — four animated counters (scroll-triggered)
 *   5. Testimonials    — three placeholder quotes
 *   6. Gallery         — six tiles, real-image swappable
 *   7. Featured video  — optional, only renders if a video URL is set
 *   8. News strip      — only renders if there's news from the API
 *   9. Contact CTA     — gradient banner with phone/email/address
 *  10. Footer          — logo + quick links
 *
 * Every section uses Reveal for scroll-in entrance animation. Cards use
 * `.card-lift` for hover lift + brand-coloured shadow. Images use
 * `.image-zoom-wrap` for the slow zoom on hover. Buttons on CTAs use
 * `.btn-shine` for a hover sweep highlight. Floating decorative blobs
 * use `.blob-anim` / `.blob-anim-2` from index.css.
 *
 * To add real images: every gallery tile reads `galleryImage{N}Url` from
 * translations.js. Set those keys to image URLs (uploaded via
 * /api/upload or external) and the placeholders are replaced
 * automatically. Same pattern for the optional `featuredVideoUrl` key
 * (any YouTube URL — auto-embeds).
 */
export default function Landing() {
  const { t, ml, lang } = useLang();
  const [news, setNews] = useState([]);

  useEffect(() => {
    api.get('/news').then((r) => setNews(r.data)).catch(() => {});
  }, []);

  const featuredVideoUrl = (t('featuredVideoUrl') || '').trim();

  return (
    <div className="-mx-4 -my-6 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 overflow-x-hidden">
      <Hero       t={t} lang={lang} />
      <About      t={t} />
      <Courses    t={t} />
      <Stats      t={t} />
      <Testimonials t={t} />
      <Gallery    t={t} />
      {featuredVideoUrl && <FeaturedVideo t={t} url={featuredVideoUrl} />}
      {news.length > 0 && <NewsStrip t={t} ml={ml} lang={lang} news={news} />}
      <ContactCTA t={t} />
      <Footer     t={t} />
    </div>
  );
}

/* ============================================================ Hero */

function Hero({ t, lang }) {
  return (
    <section className="relative overflow-hidden">
      {/* Multi-layer animated background. The animated-gradient pans
          slowly; on top of it sit two large blurred blobs that drift
          via blob-float keyframes. The whole thing is behind content
          (-z-10) and fully decorative (aria-hidden). */}
      <div
        className="absolute inset-0 -z-10 animated-gradient"
        style={{
          background:
            'linear-gradient(120deg, #FAFBFF 0%, #F5F3FF 25%, #EFF6FF 55%, #ECFDF5 80%, #FAFBFF 100%)',
        }}
        aria-hidden="true"
      />
      <div
        className="absolute inset-0 -z-10 hidden dark:block animated-gradient"
        style={{
          background:
            'linear-gradient(120deg, #0B1220 0%, #1E1B4B 25%, #0F172A 55%, #064E3B 80%, #0B1220 100%)',
        }}
        aria-hidden="true"
      />
      {/* Floating blobs — pure decoration, very low opacity in dark
          mode so the page feels open rather than crowded. */}
      <div
        aria-hidden="true"
        className="blob-anim absolute -top-24 -right-32 w-[34rem] h-[34rem] rounded-full opacity-60 dark:opacity-30 blur-3xl"
        style={{ background: 'radial-gradient(closest-side, rgba(167, 139, 250, 0.6), transparent)' }}
      />
      <div
        aria-hidden="true"
        className="blob-anim-2 absolute -bottom-32 -left-24 w-[30rem] h-[30rem] rounded-full opacity-60 dark:opacity-25 blur-3xl"
        style={{ background: 'radial-gradient(closest-side, rgba(125, 211, 252, 0.55), transparent)' }}
      />
      <div
        aria-hidden="true"
        className="blob-anim absolute top-1/2 left-1/3 w-[20rem] h-[20rem] rounded-full opacity-40 dark:opacity-15 blur-3xl"
        style={{
          background: 'radial-gradient(closest-side, rgba(251, 207, 232, 0.55), transparent)',
          animationDelay: '4s',
        }}
      />

      <div className="relative max-w-6xl mx-auto px-6 pt-16 pb-24 md:pt-24 md:pb-32 grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
        <Reveal className="text-center md:text-start">
          <div className="flex md:justify-start justify-center mb-6">
            <div className="float-y rounded-2xl bg-white/70 dark:bg-white/5 backdrop-blur p-2 shadow-lg">
              <Logo variant="badge" size={72} />
            </div>
          </div>

          <h1 className="text-4xl md:text-6xl font-extrabold leading-[1.05] mb-5 tracking-tight">
            {t('heroTitle')}
          </h1>
          <p className="text-lg md:text-xl text-slate-600 dark:text-slate-300 mb-8 max-w-xl mx-auto md:mx-0">
            {t('heroTagline')}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center md:justify-start gap-3">
            <Link
              to="/register"
              className="btn-shine glow-pulse px-6 py-3 rounded-full font-semibold text-white shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5"
              style={{ background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)' }}
            >
              {t('registerNow') || 'Register now'}
              <span className="ms-2">{lang === 'ar' ? '←' : '→'}</span>
            </Link>
            <Link
              to="/login"
              className="px-6 py-3 rounded-full font-semibold border-2 border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500 hover:bg-white/40 dark:hover:bg-white/5 transition"
            >
              {t('login')}
            </Link>
          </div>

          <div className="mt-7 flex items-center justify-center md:justify-start gap-4 text-sm text-slate-500 dark:text-slate-400">
            <span className="inline-flex items-center gap-1">
              <span className="text-amber-500">★★★★★</span>
              <span>{t('heroProofRating') || 'Trusted by families'}</span>
            </span>
          </div>
        </Reveal>

        <Reveal variant="scale" delay={2} className="hidden md:block">
          <DecorativeStack t={t} />
        </Reveal>
      </div>
    </section>
  );
}

/**
 * Decorative stacked-card composition for the hero. Three layers of
 * tilted gradient cards (back two are decoration), the front card has
 * "window dot" controls + skeleton lines + the four level chips. Each
 * level chip floats on its own delay so the row breathes gently.
 */
function DecorativeStack({ t }) {
  const levelChips = [
    { lv: 'A', color: '#60A5FA', delay: '0s' },
    { lv: 'B', color: '#A78BFA', delay: '0.4s' },
    { lv: 'C', color: '#34D399', delay: '0.8s' },
    { lv: 'D', color: '#FBBF24', delay: '1.2s' },
  ];
  return (
    <div className="relative aspect-square max-w-md mx-auto">
      <div
        className="absolute inset-x-8 top-0 h-3/4 rounded-3xl shadow-xl float-y-slow"
        style={{ background: 'linear-gradient(135deg, #DBEAFE 0%, #E9D5FF 100%)', transform: 'rotate(-6deg)' }}
        aria-hidden="true"
      />
      <div
        className="absolute inset-x-4 top-8 h-3/4 rounded-3xl shadow-xl float-y-slow"
        style={{ background: 'linear-gradient(135deg, #FEF3C7 0%, #FBCFE8 100%)', transform: 'rotate(3deg)', animationDelay: '1.5s' }}
        aria-hidden="true"
      />
      <div className="absolute inset-x-0 top-16 h-3/4 rounded-3xl bg-white dark:bg-slate-900 shadow-xl border border-slate-200 dark:border-slate-800 p-8 flex flex-col">
        <div className="flex items-center gap-2 mb-5" aria-hidden="true">
          <span className="w-3 h-3 rounded-full bg-rose-300" />
          <span className="w-3 h-3 rounded-full bg-amber-300" />
          <span className="w-3 h-3 rounded-full bg-emerald-300" />
        </div>
        <div className="space-y-3">
          <div className="h-3 rounded-full bg-slate-200 dark:bg-slate-800 w-3/4" />
          <div className="h-3 rounded-full bg-slate-200 dark:bg-slate-800 w-full" />
          <div className="h-3 rounded-full bg-slate-200 dark:bg-slate-800 w-5/6" />
        </div>
        <div className="mt-auto grid grid-cols-4 gap-2">
          {levelChips.map((c) => (
            <div
              key={c.lv}
              className="float-y aspect-square rounded-xl flex items-center justify-center text-2xl font-extrabold text-white shadow-sm"
              style={{ background: c.color, animationDelay: c.delay }}
            >
              {c.lv}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ============================================================ About */

function About({ t }) {
  const pillars = [
    {
      icon: '💛',
      title: t('aboutValueWarmthTitle')    || 'Warm community',
      text:  t('aboutValueWarmthText')     || 'A welcoming space where every child feels seen, supported, and excited to learn.',
    },
    {
      icon: '🎓',
      title: t('aboutValueExpertiseTitle') || 'Expert teachers',
      text:  t('aboutValueExpertiseText')  || 'Qualified, patient educators who tailor their approach to each learner\u2019s pace and level.',
    },
    {
      icon: '🌱',
      title: t('aboutValueCommunityTitle') || 'Growth that sticks',
      text:  t('aboutValueCommunityText')  || 'Step-by-step lessons that build real skills — from first letters to confident reading.',
    },
  ];

  return (
    <section className="bg-slate-50 dark:bg-slate-900/50 py-20 md:py-24 relative overflow-hidden">
      <Reveal className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-14 max-w-2xl mx-auto">
          <Eyebrow text={t('aboutEyebrow') || 'About us'} />
          <h2 className="text-3xl md:text-4xl font-extrabold mb-4 tracking-tight">
            {t('aboutTitle')}
          </h2>
          <p className="text-slate-600 dark:text-slate-300 text-lg leading-relaxed">
            {t('aboutLeadText') || t('aboutText')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {pillars.map((p, i) => (
            <Reveal
              key={i}
              delay={i + 1}
              className="card-lift bg-white dark:bg-slate-900 rounded-2xl p-7 shadow-sm border border-slate-200 dark:border-slate-800"
            >
              <div className="text-4xl mb-4 transition-transform group-hover:scale-110">{p.icon}</div>
              <h3 className="text-lg font-bold mb-2">{p.title}</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{p.text}</p>
            </Reveal>
          ))}
        </div>
      </Reveal>
    </section>
  );
}

/* ============================================================ Courses */

function Courses({ t }) {
  const levels = [
    { lv: 'A', color: '#60A5FA', desc: t('levelADesc') || 'ages 6–12'    },
    { lv: 'B', color: '#A78BFA', desc: t('levelBDesc') || 'ages 13–16'   },
    { lv: 'C', color: '#34D399', desc: t('levelCDesc') || 'reads Arabic' },
    { lv: 'D', color: '#FBBF24', desc: t('levelDDesc') || 'reads Quran'  },
  ];

  return (
    <section className="py-20 md:py-24 relative overflow-hidden">
      {/* Subtle background dot pattern, decorative only */}
      <div
        className="absolute inset-0 -z-10 opacity-40 dark:opacity-20"
        aria-hidden="true"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, rgba(99, 102, 241, 0.15) 1px, transparent 0)',
          backgroundSize: '32px 32px',
        }}
      />
      <Reveal className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-14 max-w-2xl mx-auto">
          <Eyebrow text={t('coursesEyebrow') || 'Our levels'} />
          <h2 className="text-3xl md:text-4xl font-extrabold mb-4 tracking-tight">
            {t('coursesTitle') || 'A path for every learner'}
          </h2>
          <p className="text-slate-600 dark:text-slate-300 text-lg leading-relaxed">
            {t('coursesLead') ||
              'Four clear levels meet students where they are — whether they\u2019re just starting out or already confidently reading the Quran.'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {levels.map((l, i) => (
            <Reveal
              key={l.lv}
              delay={i + 1}
              variant="scale"
              className="card-lift group rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
            >
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-extrabold text-white mb-4 shadow-sm transition-transform group-hover:scale-110 group-hover:rotate-3"
                style={{ background: l.color }}
              >
                {l.lv}
              </div>
              <h3 className="text-lg font-bold mb-1">{t('level')} {l.lv}</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">{l.desc}</p>
            </Reveal>
          ))}
        </div>
      </Reveal>
    </section>
  );
}

/* ============================================================ Stats */

function Stats({ t }) {
  // Each stat parses as "value, label". The animated counter only runs
  // when the section enters view (one-shot). Values that aren't numeric
  // (e.g. "4+") fall back to a static render — Counter detects that.
  const stats = [
    { value: t('stat1Value') || '120+', label: t('stat1Label') || 'Active students' },
    { value: t('stat2Value') || '12',   label: t('stat2Label') || 'Expert teachers' },
    { value: t('stat3Value') || '5',    label: t('stat3Label') || 'Years of experience' },
    { value: t('stat4Value') || '4',    label: t('stat4Label') || 'Learning levels' },
  ];

  const [ref, visible] = useScrollReveal();

  return (
    <section ref={ref} className="bg-slate-50 dark:bg-slate-900/50 py-16">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((s, i) => (
            <div
              key={i}
              className={`text-center reveal-up reveal-d${i + 1} ${visible ? 'is-visible' : ''}`}
            >
              <div className="text-4xl md:text-5xl font-extrabold mb-1 bg-clip-text text-transparent"
                   style={{ backgroundImage: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)' }}>
                <Counter target={s.value} active={visible} />
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-400 font-medium">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/**
 * Animates a number from 0 up to its parsed target over ~1.4s using
 * requestAnimationFrame. If the target string can't be parsed as a
 * number (e.g. "Many"), renders it verbatim with no animation.
 *
 * `active` is the gate — the count only starts after the parent's
 * scroll-reveal flips. This avoids the value being already at its end
 * when the user finally scrolls down to it.
 */
function Counter({ target, active }) {
  const [n, setN] = useState(0);
  const finishedRef = useRef(false);

  // Strip non-digits to get the numeric portion; remember the suffix so
  // "120+" still renders correctly as "120+" at the end.
  const match = String(target).match(/^(\d[\d,]*)(.*)$/);
  const numeric = match ? Number(match[1].replace(/,/g, '')) : NaN;
  const suffix = match ? match[2] : '';

  useEffect(() => {
    if (!active || finishedRef.current) return;
    if (!Number.isFinite(numeric)) { finishedRef.current = true; return; }

    const duration = 1400;
    const start = performance.now();
    let raf;
    const tick = (now) => {
      const elapsed = now - start;
      const t = Math.min(1, elapsed / duration);
      // Ease-out cubic so big numbers don't shoot past then snap back.
      const eased = 1 - Math.pow(1 - t, 3);
      setN(Math.round(eased * numeric));
      if (t < 1) raf = requestAnimationFrame(tick);
      else finishedRef.current = true;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, numeric]);

  if (!Number.isFinite(numeric)) return target;
  return <>{n}{suffix}</>;
}

/* ============================================================ Testimonials */

function Testimonials({ t }) {
  const items = [
    {
      quote: t('testimonial1Quote')  || 'My daughter went from hesitant to confident in just a few months. She actually looks forward to her lessons now.',
      author: t('testimonial1Author') || 'Mother of a level A student',
      avatar: '👩',
      bg: '#FCE7F3',
    },
    {
      quote: t('testimonial2Quote')  || 'The teachers are patient and warm, and the dashboard makes it easy for me to follow along with what my son is learning.',
      author: t('testimonial2Author') || 'Father of a level B student',
      avatar: '👨',
      bg: '#DBEAFE',
    },
    {
      quote: t('testimonial3Quote')  || 'A truly welcoming community. I\u2019m grateful my children are learning with such dedicated educators.',
      author: t('testimonial3Author') || 'Parent of two students',
      avatar: '👪',
      bg: '#D1FAE5',
    },
  ];

  return (
    <section className="py-20 md:py-24">
      <Reveal className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-14 max-w-2xl mx-auto">
          <Eyebrow text={t('testimonialsEyebrow') || 'Testimonials'} />
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">
            {t('testimonialsTitle') || 'What families are saying'}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {items.map((it, i) => (
            <Reveal
              key={i}
              delay={i + 1}
              as="figure"
              className="card-lift bg-white dark:bg-slate-900 rounded-2xl p-7 shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col"
            >
              <div className="text-4xl text-indigo-200 dark:text-indigo-700 mb-2 leading-none" aria-hidden="true">
                &ldquo;
              </div>
              <blockquote className="text-slate-700 dark:text-slate-300 leading-relaxed flex-1">
                {it.quote}
              </blockquote>
              <figcaption className="mt-5 flex items-center gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-xl"
                  style={{ background: it.bg }}
                >
                  {it.avatar}
                </div>
                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  {it.author}
                </span>
              </figcaption>
            </Reveal>
          ))}
        </div>
      </Reveal>
    </section>
  );
}

/* ============================================================ Gallery */

function Gallery({ t }) {
  // Each tile's image URL comes from a translation key. The school
  // can fill any/all of these in translations.js (or via uploaded
  // /uploads/… URLs). When empty, we render the gradient + icon
  // placeholder. Either way, the image-zoom-wrap gives the same hover
  // zoom for visual consistency.
  const tiles = [
    { src: t('galleryImage1Url') || '', icon: '📚', label: t('galleryClassrooms')  || 'Classrooms',     bg: 'linear-gradient(135deg, #DBEAFE, #BFDBFE)' },
    { src: t('galleryImage2Url') || '', icon: '✏️', label: t('galleryActivities')  || 'Activities',     bg: 'linear-gradient(135deg, #FEF3C7, #FDE68A)' },
    { src: t('galleryImage3Url') || '', icon: '🌳', label: t('galleryOutdoors')    || 'Outdoors',       bg: 'linear-gradient(135deg, #D1FAE5, #A7F3D0)' },
    { src: t('galleryImage4Url') || '', icon: '🎨', label: t('galleryArt')         || 'Art & crafts',   bg: 'linear-gradient(135deg, #FCE7F3, #FBCFE8)' },
    { src: t('galleryImage5Url') || '', icon: '🤝', label: t('galleryCommunity')   || 'Community',      bg: 'linear-gradient(135deg, #E9D5FF, #DDD6FE)' },
    { src: t('galleryImage6Url') || '', icon: '🎉', label: t('galleryEvents')      || 'Events',         bg: 'linear-gradient(135deg, #FFEDD5, #FED7AA)' },
  ];

  return (
    <section className="bg-slate-50 dark:bg-slate-900/50 py-20 md:py-24">
      <Reveal className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-14 max-w-2xl mx-auto">
          <Eyebrow text={t('galleryEyebrow') || 'Life at the academy'} />
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">
            {t('galleryTitle') || 'A glimpse inside'}
          </h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {tiles.map((tile, i) => (
            <Reveal
              key={i}
              delay={(i % 3) + 1}
              className="image-zoom-wrap aspect-square rounded-2xl shadow-sm overflow-hidden relative group cursor-pointer"
            >
              {tile.src ? (
                <img
                  src={tile.src}
                  alt={tile.label}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div
                  className="image-zoom-target absolute inset-0 flex flex-col items-center justify-center text-center p-4"
                  style={{ background: tile.bg }}
                >
                  <span className="text-5xl md:text-6xl mb-2">
                    {tile.icon}
                  </span>
                  <span className="text-sm font-semibold text-slate-700">
                    {tile.label}
                  </span>
                </div>
              )}
              {/* Caption strip overlay — visible on hover when there's a
                  real image, otherwise the placeholder already shows the
                  label so we hide this. */}
              {tile.src && (
                <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-sm font-semibold text-white">{tile.label}</span>
                </div>
              )}
            </Reveal>
          ))}
        </div>
      </Reveal>
    </section>
  );
}

/* ============================================================ Featured video */

function FeaturedVideo({ t, url }) {
  const yt = extractYouTubeId(url);
  return (
    <section className="py-20 md:py-24">
      <Reveal className="max-w-5xl mx-auto px-6">
        <div className="text-center mb-10 max-w-2xl mx-auto">
          <Eyebrow text={t('featuredVideoEyebrow') || 'Watch'} />
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-3">
            {t('featuredVideoTitle') || 'Take a look inside'}
          </h2>
          <p className="text-slate-600 dark:text-slate-300 text-lg leading-relaxed">
            {t('featuredVideoLead') || 'A short tour of our classrooms, our teachers, and our students at work.'}
          </p>
        </div>

        <Reveal
          variant="scale"
          delay={2}
          className="rounded-3xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 bg-black"
          style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}
        >
          {yt ? (
            <iframe
              src={`https://www.youtube.com/embed/${yt}`}
              title="Featured video"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
            />
          ) : (
            <video
              src={url}
              controls
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
            />
          )}
        </Reveal>
      </Reveal>
    </section>
  );
}

/* ============================================================ News strip */

function NewsStrip({ t, ml, lang, news }) {
  return (
    <section className="bg-slate-50 dark:bg-slate-900/50 py-16">
      <Reveal className="max-w-6xl mx-auto px-6">
        <div className="flex items-end justify-between flex-wrap gap-3 mb-8">
          <div>
            <Eyebrow text={t('newsEyebrow') || 'Latest'} />
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">{t('newsTitle')}</h2>
          </div>
          <Link to="/news" className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
            {t('viewAll') || 'View all'}
            <span className="ms-1">{lang === 'ar' ? '←' : '→'}</span>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {news.slice(0, 3).map((n, i) => (
            <Reveal
              key={n._id}
              delay={i + 1}
              as={Link}
              to={`/news/${n._id}`}
              className="card-lift block bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm"
            >
              <div className="image-zoom-wrap aspect-video w-full overflow-hidden flex items-center justify-center"
                   style={{ background: 'linear-gradient(135deg, #FBCFE8, #BFDBFE)' }}>
                {n.coverImage ? (
                  <img src={n.coverImage} alt="" className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <span className="image-zoom-target text-5xl opacity-70">🌟</span>
                )}
              </div>
              <div className="p-5">
                <h3 className="font-bold mb-1 line-clamp-2">{ml(n.title)}</h3>
                <p className="text-xs text-slate-500">
                  {new Date(n.createdAt).toLocaleDateString(
                    lang === 'ar' ? 'ar-EG' : lang === 'nl' ? 'nl-NL' : 'en-US'
                  )}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </Reveal>
    </section>
  );
}

/* ============================================================ Contact CTA */

function ContactCTA({ t }) {
  return (
    <section className="relative py-20 md:py-28 overflow-hidden">
      <div
        className="absolute inset-0 -z-10 animated-gradient"
        style={{
          background:
            'linear-gradient(135deg, #4F46E5 0%, #7C3AED 30%, #DB2777 70%, #4F46E5 100%)',
        }}
        aria-hidden="true"
      />
      {/* Decorative floating glow blobs */}
      <div
        className="blob-anim absolute -top-32 -left-20 w-96 h-96 rounded-full opacity-30 blur-3xl"
        style={{ background: 'radial-gradient(closest-side, white, transparent)' }}
        aria-hidden="true"
      />
      <div
        className="blob-anim-2 absolute -bottom-32 -right-20 w-[28rem] h-[28rem] rounded-full opacity-30 blur-3xl"
        style={{ background: 'radial-gradient(closest-side, white, transparent)' }}
        aria-hidden="true"
      />

      <Reveal className="relative max-w-5xl mx-auto px-6 text-center text-white">
        <h2 className="text-3xl md:text-5xl font-extrabold mb-5 tracking-tight">
          {t('ctaTitle') || 'Ready to start the journey?'}
        </h2>
        <p className="text-lg md:text-xl text-white/90 mb-9 max-w-2xl mx-auto">
          {t('ctaSubtitle') ||
            'Register today and we\u2019ll get back to you with everything you need to begin.'}
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-12">
          <Link
            to="/register"
            className="btn-shine px-7 py-3.5 rounded-full font-semibold bg-white text-indigo-600 shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all"
          >
            {t('registerNow') || 'Register now'}
          </Link>
          <Link
            to="/login"
            className="px-7 py-3.5 rounded-full font-semibold border-2 border-white/40 text-white hover:bg-white/10 transition"
          >
            {t('login')}
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-white/95 max-w-3xl mx-auto pt-8 border-t border-white/20">
          <ContactBit
            icon="✉️"
            label={t('contactEmailLabel') || 'Email'}
            value={t('contactEmailValue') || 'info@example.com'}
            href={`mailto:${t('contactEmailValue') || 'info@example.com'}`}
          />
          <ContactBit
            icon="📞"
            label={t('contactPhoneLabel') || 'Phone'}
            value={t('contactPhoneValue') || '+32 000 00 00 00'}
            href={`tel:${(t('contactPhoneValue') || '+32 000 00 00 00').replace(/\s+/g, '')}`}
          />
          <ContactBit
            icon="📍"
            label={t('contactAddressLabel') || 'Address'}
            value={t('contactAddressValue') || 'Gent, Belgium'}
          />
        </div>
      </Reveal>
    </section>
  );
}

function ContactBit({ icon, label, value, href }) {
  const Inner = (
    <>
      <div className="text-3xl mb-2 transition-transform hover:scale-110" aria-hidden="true">{icon}</div>
      <div className="text-xs uppercase tracking-wider text-white/70 mb-1">{label}</div>
      <div className="font-semibold">{value}</div>
    </>
  );
  return href ? (
    <a href={href} className="block hover:text-white transition group">{Inner}</a>
  ) : (
    <div>{Inner}</div>
  );
}

/* ============================================================ Footer */

function Footer({ t }) {
  return (
    <footer className="bg-slate-900 text-slate-300 px-6 py-10">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-5">
        <div className="flex items-center gap-3">
          <Logo   size={70} color="white" />
          {/* <span className="font-semibold text-white">{t('appName')}</span> */}
        </div>
        <div className="flex items-center gap-5 text-sm">
          <Link to="/news"     className="hover:text-white transition relative group">
            {t('newsTitle')}
            <span className="absolute left-0 -bottom-1 h-0.5 w-0 bg-indigo-400 group-hover:w-full transition-all" />
          </Link>
          <Link to="/register" className="hover:text-white transition relative group">
            {t('register') || t('registerNow') || 'Register'}
            <span className="absolute left-0 -bottom-1 h-0.5 w-0 bg-indigo-400 group-hover:w-full transition-all" />
          </Link>
          <Link to="/login"    className="hover:text-white transition relative group">
            {t('login')}
            <span className="absolute left-0 -bottom-1 h-0.5 w-0 bg-indigo-400 group-hover:w-full transition-all" />
          </Link>
        </div>
        <p className="text-xs text-slate-500">
          © {new Date().getFullYear()} {t('appName')}
        </p>
      </div>
    </footer>
  );
}

/* ============================================================ small bits */

function Eyebrow({ text }) {
  return (
    <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-2">
      {text}
    </p>
  );
}
