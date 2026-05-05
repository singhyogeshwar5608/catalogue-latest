'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronDown, Headphones, Link2, Mail, MapPin, Phone } from 'lucide-react';
import desktopLogo from '@/assets/Larawans.svg';
import {
  FACEBOOK_SOCIAL_BRAND_ICON_URL,
  INSTAGRAM_SOCIAL_BRAND_ICON_URL,
  LINKEDIN_SOCIAL_BRAND_ICON_URL,
  SOCIAL_BRAND_ICON_DISPLAY_PX,
  SOCIAL_BRAND_ICON_ROW_GAP_PX,
  YOUTUBE_SOCIAL_BRAND_ICON_URL,
} from '@/src/lib/socialBrandAssets';

const FOOTER_SOCIAL_LINKS = {
  youtube: process.env.NEXT_PUBLIC_SOCIAL_YOUTUBE_URL || '#',
  facebook: process.env.NEXT_PUBLIC_SOCIAL_FACEBOOK_URL || '#',
  instagram: process.env.NEXT_PUBLIC_SOCIAL_INSTAGRAM_URL || '#',
  linkedin: process.env.NEXT_PUBLIC_SOCIAL_LINKEDIN_URL || '#',
};

const footerSocialIcons = [
  { label: 'YouTube', href: FOOTER_SOCIAL_LINKS.youtube, iconSrc: YOUTUBE_SOCIAL_BRAND_ICON_URL },
  { label: 'Facebook', href: FOOTER_SOCIAL_LINKS.facebook, iconSrc: FACEBOOK_SOCIAL_BRAND_ICON_URL },
  { label: 'Instagram', href: FOOTER_SOCIAL_LINKS.instagram, iconSrc: INSTAGRAM_SOCIAL_BRAND_ICON_URL },
  { label: 'LinkedIn', href: FOOTER_SOCIAL_LINKS.linkedin, iconSrc: LINKEDIN_SOCIAL_BRAND_ICON_URL },
];

type AccordionId = 'quick' | 'support' | 'contact' | 'address';

function WeAcceptLogos() {
  return (
    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
      <div className="flex h-7 min-w-[2.75rem] items-center justify-center rounded border border-gray-200 bg-white px-2 shadow-sm">
        <span className="text-[10px] font-bold tracking-tight text-blue-700">VISA</span>
      </div>
      <div className="flex h-7 min-w-[2.75rem] items-center justify-center rounded border border-gray-200 bg-white px-2 shadow-sm">
        <span className="text-[9px] font-bold text-red-600">Mastercard</span>
      </div>
      <div className="flex h-7 min-w-[2.75rem] items-center justify-center rounded border border-gray-200 bg-white px-2 shadow-sm">
        <span className="text-[10px] font-bold text-slate-700">RuPay</span>
      </div>
      <div className="flex h-7 min-w-[2.75rem] items-center justify-center rounded border border-gray-200 bg-white px-2 shadow-sm">
        <span className="text-[10px] font-bold text-indigo-700">UPI</span>
      </div>
      <div className="flex h-7 min-w-[3.25rem] items-center justify-center rounded border border-gray-200 bg-black px-1.5 shadow-sm">
        <span className="text-[8px] font-semibold leading-tight text-white">Apple Pay</span>
      </div>
    </div>
  );
}

function DesktopWeAcceptLogos() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      {[
        { label: 'VISA', className: 'text-[10px] font-bold tracking-tight text-blue-700' },
        { label: 'Mastercard', className: 'text-[9px] font-bold text-red-600' },
        { label: 'RuPay', className: 'text-[10px] font-bold text-slate-700' },
        { label: 'UPI', className: 'text-[10px] font-bold text-indigo-700' },
        { label: 'Apple Pay', className: 'text-[8px] font-semibold leading-tight text-white', dark: true },
      ].map((item) => (
        <div
          key={item.label}
          className={`flex h-8 min-w-[3.1rem] items-center justify-center rounded-lg border border-slate-200 bg-white px-2 shadow-sm transition ${
            item.dark ? 'bg-slate-950 border-slate-950' : ''
          } hover:-translate-y-0.5 hover:scale-[1.03] hover:shadow-md`}
        >
          <span className={item.className}>{item.label}</span>
        </div>
      ))}
    </div>
  );
}

function TrustBadgeCards() {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      <div className="flex items-center rounded-xl border border-emerald-100 bg-white/70 p-2.5 shadow-sm sm:p-3">
        <div className="mr-2.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500 sm:mr-3 sm:h-9 sm:w-9">
          <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <path
              fillRule="evenodd"
              d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <div className="min-w-0">
          <div className="text-[11px] font-semibold leading-tight text-gray-900 sm:text-xs">Trusted</div>
          <div className="text-[10px] leading-tight text-gray-500 sm:text-[11px]">Verified sellers &amp; stores</div>
        </div>
      </div>
      <div className="flex items-center rounded-xl border border-sky-100 bg-white/70 p-2.5 shadow-sm sm:p-3">
        <div className="mr-2.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-600 sm:mr-3 sm:h-9 sm:w-9">
          <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <path
              fillRule="evenodd"
              d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <div className="min-w-0">
          <div className="text-[11px] font-semibold leading-tight text-gray-900 sm:text-xs">Guaranteed payment</div>
          <div className="text-[10px] leading-tight text-gray-500 sm:text-[11px]">Secure checkout with sellers</div>
        </div>
      </div>
      <div className="col-span-2 flex items-center rounded-xl border border-red-100 bg-white/70 p-2.5 shadow-sm sm:col-span-1 sm:p-3">
        <div className="mr-2.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-500 sm:mr-3 sm:h-9 sm:w-9">
          <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
        <div className="min-w-0">
          <div className="text-[11px] font-semibold leading-tight text-gray-900 sm:text-xs">SSL Secured</div>
          <div className="text-[10px] leading-tight text-gray-500 sm:text-[11px]">Safe &amp; secure</div>
        </div>
      </div>
    </div>
  );
}

function DesktopTrustBadgeCards() {
  const cardBase =
    'flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md';
  const iconBoxBase = 'flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-white';

  return (
    <div className="grid grid-cols-4 gap-4">
      <div className={cardBase}>
        <div className={`${iconBoxBase} bg-emerald-600`}>
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <path
              fillRule="evenodd"
              d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-950">Trusted</p>
          <p className="mt-0.5 text-xs text-slate-500">Verified sellers &amp; stores</p>
        </div>
      </div>

      <div className={cardBase}>
        <div className={`${iconBoxBase} bg-sky-600`}>
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <path
              fillRule="evenodd"
              d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-950">Secure Payment</p>
          <p className="mt-0.5 text-xs text-slate-500">Protected checkout flow</p>
        </div>
      </div>

      <div className={cardBase}>
        <div className={`${iconBoxBase} bg-rose-600`}>
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-950">SSL Secured</p>
          <p className="mt-0.5 text-xs text-slate-500">Encrypted connections</p>
        </div>
      </div>

      <div className={cardBase}>
        <div className={`${iconBoxBase} bg-violet-600`}>
          <Headphones className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-950">Support</p>
          <p className="mt-0.5 text-xs text-slate-500">Help center + direct team</p>
        </div>
      </div>
    </div>
  );
}

function FooterAccordion({
  openId,
  setOpenId,
}: {
  openId: AccordionId | null;
  setOpenId: (id: AccordionId | null) => void;
}) {
  const toggle = (id: AccordionId) => {
    setOpenId(openId === id ? null : id);
  };

  const accBtn = 'flex w-full items-center justify-between gap-[9px] py-[13px] text-left';
  const accRow = 'flex min-w-0 items-center gap-[9px]';
  const accIconBox = 'flex h-[37px] w-[37px] shrink-0 items-center justify-center rounded-xl';
  const accIcon = 'h-[17px] w-[17px] text-white';
  const accChevron = 'h-[17px] w-[17px] shrink-0 text-gray-500 transition-transform duration-200';
  const accPanel = 'space-y-[5px] pb-[13px] pl-[49px] pr-1';

  return (
    <div className="footer-mobile-acc divide-y divide-gray-200 border-t border-gray-200 bg-white/40 lg:hidden">
      <div className="px-0">
        <button type="button" className={accBtn} onClick={() => toggle('quick')} aria-expanded={openId === 'quick'}>
          <span className={accRow}>
            <span className={`${accIconBox} bg-blue-500`}>
              <Link2 className={accIcon} aria-hidden />
            </span>
            <span className="text-[13px] font-semibold text-gray-900">Quick Links</span>
          </span>
          <ChevronDown
            className={`${accChevron} ${openId === 'quick' ? 'rotate-180' : ''}`}
            aria-hidden
          />
        </button>
        {openId === 'quick' ? (
          <ul className={accPanel}>
            <li>
              <Link href="/about" className="footer-mobile-acc-link footer-link text-gray-600 hover:text-red-600">
                About Us
              </Link>
            </li>
            <li>
              <Link href="/contact" className="footer-mobile-acc-link footer-link text-gray-600 hover:text-red-600">
                Contact
              </Link>
            </li>
            <li>
              <Link href="/stores" className="footer-mobile-acc-link footer-link text-gray-600 hover:text-red-600">
                All Stores
              </Link>
            </li>
            <li>
              <Link href="/create-store" className="footer-mobile-acc-link footer-link text-gray-600 hover:text-red-600">
                Create Store
              </Link>
            </li>
            <li>
              <Link href="/pricing" className="footer-mobile-acc-link footer-link text-gray-600 hover:text-red-600">
                Pricing
              </Link>
            </li>
            <li>
              <Link href="/admin" className="footer-mobile-acc-link footer-link text-gray-600 hover:text-red-600">
                Admin Panel
              </Link>
            </li>
          </ul>
        ) : null}
      </div>

      <div>
        <button type="button" className={accBtn} onClick={() => toggle('support')} aria-expanded={openId === 'support'}>
          <span className={accRow}>
            <span className={`${accIconBox} bg-emerald-500`}>
              <Headphones className={accIcon} aria-hidden />
            </span>
            <span className="text-[13px] font-semibold text-gray-900">Support</span>
          </span>
          <ChevronDown
            className={`${accChevron} ${openId === 'support' ? 'rotate-180' : ''}`}
            aria-hidden
          />
        </button>
        {openId === 'support' ? (
          <ul className={accPanel}>
            <li>
              <Link href="/help-center" className="footer-mobile-acc-link footer-link text-gray-600 hover:text-red-500">
                Help Center
              </Link>
            </li>
            <li>
              <Link href="/terms" className="footer-mobile-acc-link footer-link text-gray-600 hover:text-red-500">
                Terms of Service
              </Link>
            </li>
            <li>
              <Link href="/privacy" className="footer-mobile-acc-link footer-link text-gray-600 hover:text-red-500">
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link href="/cookies" className="footer-mobile-acc-link footer-link text-gray-600 hover:text-red-500">
                Cookie Policy
              </Link>
            </li>
          </ul>
        ) : null}
      </div>

      <div>
        <button type="button" className={accBtn} onClick={() => toggle('contact')} aria-expanded={openId === 'contact'}>
          <span className={accRow}>
            <span className={`${accIconBox} bg-violet-500`}>
              <Phone className={accIcon} aria-hidden />
            </span>
            <span className="text-[13px] font-semibold text-gray-900">Contact Us</span>
          </span>
          <ChevronDown
            className={`${accChevron} ${openId === 'contact' ? 'rotate-180' : ''}`}
            aria-hidden
          />
        </button>
        {openId === 'contact' ? (
          <ul className="space-y-[9px] pb-[13px] pl-[49px] pr-1">
            <li className="flex items-start gap-2 text-gray-600">
              <Phone className="mt-0.5 h-[13px] w-[13px] shrink-0" aria-hidden />
              <span className="footer-mobile-acc-contact leading-6">+91-7015150181</span>
            </li>
            <li className="flex items-start gap-2 text-gray-600">
              <Phone className="mt-0.5 h-[13px] w-[13px] shrink-0" aria-hidden />
              <span className="footer-mobile-acc-contact leading-6">+91-9812456777</span>
            </li>
            <li className="flex items-start gap-2 text-gray-600">
              <Phone className="mt-0.5 h-[13px] w-[13px] shrink-0" aria-hidden />
              <span className="footer-mobile-acc-contact leading-6">+91-8930722686</span>
            </li>
            <li className="flex items-start gap-2 text-gray-600">
              <Mail className="mt-0.5 h-[13px] w-[13px] shrink-0" aria-hidden />
              <span className="footer-mobile-acc-contact leading-6">Info@larawans.com</span>
            </li>
          </ul>
        ) : null}
      </div>

      <div>
        <button type="button" className={accBtn} onClick={() => toggle('address')} aria-expanded={openId === 'address'}>
          <span className={accRow}>
            <span className={`${accIconBox} bg-pink-500`}>
              <MapPin className={accIcon} aria-hidden />
            </span>
            <span className="text-[13px] font-semibold text-gray-900">Company Address</span>
          </span>
          <ChevronDown
            className={`${accChevron} ${openId === 'address' ? 'rotate-180' : ''}`}
            aria-hidden
          />
        </button>
        {openId === 'address' ? (
          <div className="space-y-[17px] pb-[13px] pl-[49px] pr-1">
            <div>
              <p className="footer-mobile-acc-addr-label mb-[5px] font-semibold uppercase tracking-wide text-emerald-700">
                Registered Office
              </p>
              <p className="footer-mobile-acc-addr-body leading-relaxed text-gray-600">
                M/s Larawans, Village Manoharpur, District Jind, Haryana - 126102
              </p>
            </div>
            <div>
              <p className="footer-mobile-acc-addr-label mb-[5px] font-semibold uppercase tracking-wide text-emerald-700">
                Working Office
              </p>
              <p className="footer-mobile-acc-addr-body leading-relaxed text-gray-600">
                Shop No. 2, Subhash Market, Karnal Rd, Opp. District Court, Ashoka Garden Colony, Kaithal, Haryana -
                136027- India
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function Footer() {
  const [openAccordion, setOpenAccordion] = useState<AccordionId | null>(null);

  return (
    <footer className="footer-text-scale footer-shell relative overflow-hidden bg-gradient-to-br from-emerald-50 via-gray-50 to-emerald-50">
      <div className="relative z-10 pb-[0.7rem] pt-0 md:pb-[1.2rem]">
        <div className="mx-auto w-[95%] px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-5 lg:gap-12 lg:rounded-[28px] lg:border lg:border-slate-200 lg:bg-white lg:px-10 lg:py-10 lg:shadow-sm">
            <div className="animate-slideInLeft">
              <div className="mb-6 flex items-center space-x-3">
                <span className="inline-flex translate-y-1/2">
                  <Image src={desktopLogo} width={140} height={40} alt="Larawans" className="h-auto max-w-[140px]" />
                </span>
              </div>
              <p className="mb-6 leading-relaxed text-gray-600 !text-[10px] sm:!text-base">
                Build your digital store in minutes. Help local businesses grow on the online marketplace and connect
                directly with customers across India.
              </p>
              <div>
                <h4 className="mb-4 font-semibold text-gray-900">Follow Our Journey</h4>
                <div
                  className="flex flex-nowrap items-center"
                  style={SOCIAL_BRAND_ICON_ROW_GAP_PX > 0 ? { gap: `${SOCIAL_BRAND_ICON_ROW_GAP_PX}px` } : undefined}
                >
                  {footerSocialIcons.map((item) => (
                    <a
                      key={item.label}
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex shrink-0 items-center justify-center rounded-md p-0 leading-none transition hover:-translate-y-0.5 hover:opacity-90"
                      aria-label={item.label}
                    >
                      <img
                        src={item.iconSrc}
                        alt=""
                        width={SOCIAL_BRAND_ICON_DISPLAY_PX}
                        height={SOCIAL_BRAND_ICON_DISPLAY_PX}
                        className="block object-contain align-middle"
                        style={{
                          width: SOCIAL_BRAND_ICON_DISPLAY_PX,
                          height: SOCIAL_BRAND_ICON_DISPLAY_PX,
                        }}
                        aria-hidden
                      />
                    </a>
                  ))}
                </div>
              </div>
            </div>

            <FooterAccordion openId={openAccordion} setOpenId={setOpenAccordion} />

            <div className="animate-fadeInUp hidden lg:block">
              <h4 className="mb-6 font-semibold text-gray-900">Quick Links</h4>
              <ul className="space-y-1.5">
                <li>
                  <Link href="/about" className="footer-link text-gray-600 hover:text-red-600">
                    About Us
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="footer-link text-gray-600 hover:text-red-600">
                    Contact
                  </Link>
                </li>
                <li>
                  <Link href="/stores" className="footer-link text-gray-600 hover:text-red-600">
                    All Stores
                  </Link>
                </li>
                <li>
                  <Link href="/create-store" className="footer-link text-gray-600 hover:text-red-600">
                    Create Store
                  </Link>
                </li>
                <li>
                  <Link href="/pricing" className="footer-link text-gray-600 hover:text-red-600">
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link href="/admin" className="footer-link text-gray-600 hover:text-red-600">
                    Admin Panel
                  </Link>
                </li>
              </ul>
            </div>

            <div className="animate-fadeInUp hidden lg:block">
              <h4 className="mb-6 font-semibold text-gray-900">Support</h4>
              <ul className="space-y-1.5">
                <li>
                  <Link href="/help-center" className="footer-link text-gray-600 hover:text-red-500">
                    Help Center
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="footer-link text-gray-600 hover:text-red-500">
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <Link href="/privacy" className="footer-link text-gray-600 hover:text-red-500">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/cookies" className="footer-link text-gray-600 hover:text-red-500">
                    Cookie Policy
                  </Link>
                </li>
              </ul>
            </div>

            <div className="animate-fadeInUp hidden lg:block">
              <h4 className="mb-6 font-semibold text-gray-900">Company Address</h4>
              <div className="space-y-5">
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-emerald-700">Registered Office</p>
                  <p className="text-sm leading-relaxed text-gray-600">
                    M/s Larawans, Village Manoharpur, District Jind, Haryana - 126102
                  </p>
                </div>
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-emerald-700">Working Office</p>
                  <p className="text-sm leading-relaxed text-gray-600">
                    Shop No. 2, Subhash Market, Karnal Rd, Opp. District Court, Ashoka Garden Colony, Kaithal, Haryana -
                    136027- India
                  </p>
                </div>
              </div>
            </div>

            <div className="animate-fadeInUp hidden lg:block">
              <h4 className="mb-6 font-semibold text-gray-900">Contact Us</h4>
              <ul className="mb-8 w-full space-y-1.5">
                <li className="flex w-full items-start gap-2 text-gray-600">
                  <Phone className="mt-1 h-4 w-4 shrink-0" />
                  <span className="contact-number leading-6">+91-7015150181</span>
                </li>
                <li className="flex w-full items-start gap-2 text-gray-600">
                  <Phone className="mt-1 h-4 w-4 shrink-0" />
                  <span className="contact-number leading-6">+91-9812456777</span>
                </li>
                <li className="flex w-full items-start gap-2 text-gray-600">
                  <Phone className="mt-1 h-4 w-4 shrink-0" />
                  <span className="contact-number leading-6">+91-8930722686</span>
                </li>
                <li className="flex w-full items-start gap-2 text-gray-600">
                  <Mail className="mt-1 h-4 w-4 shrink-0" />
                  <span className="leading-6">Info@larawans.com</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Mobile: below accordion */}
          <div className="mt-6 space-y-6 lg:hidden">
            <div className="rounded-xl border border-gray-100 bg-white/50 px-4 py-4 shadow-sm">
              <p className="mb-3 text-sm font-semibold text-gray-800">We accept:</p>
              <WeAcceptLogos />
            </div>
            <TrustBadgeCards />
          </div>

          {/* Desktop: trust badges + payments */}
          <div className="mt-10 hidden lg:block">
            <div className="rounded-[28px] border border-slate-200 bg-white px-10 py-8 shadow-sm">
              <div className="mb-6">
                <h4 className="text-base font-semibold text-slate-950">Why shop with confidence</h4>
                <p className="mt-1 text-sm text-slate-500">Trust signals that help buyers and sellers feel safe.</p>
              </div>
              <DesktopTrustBadgeCards />

              <div className="mt-8 border-t border-slate-200 pt-6">
                <p className="mb-4 text-center text-sm font-semibold text-slate-800">Payment methods</p>
                <DesktopWeAcceptLogos />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile bottom bar (unchanged) */}
      <div className="relative z-10 mb-[calc(env(safe-area-inset-bottom)+72px)] border-t border-white/50 bg-white/30 backdrop-blur-sm md:mb-0 lg:hidden">
        <div className="mx-auto w-[95%] px-4 pb-6 pt-0 sm:px-6 md:pt-6 lg:px-8">
          <div className="animate-fadeInUp flex flex-col items-center justify-between space-y-4 lg:flex-row lg:space-y-0">
            <div className="text-center lg:text-left">
              <p className="text-sm text-gray-600">&copy; 2026 Larawans (M/s LARAWANS). All rights reserved.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop bottom bar */}
      <div className="relative z-10 hidden lg:block">
        <div className="bg-slate-950">
          <div className="mx-auto w-[95%] px-4 py-5 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between gap-6">
              <p className="text-sm text-slate-200">&copy; 2026 Larawans (M/s LARAWANS). All rights reserved.</p>
              <div className="flex items-center gap-5 text-sm">
                <Link href="/terms" className="footer-bottom-link text-slate-200">
                  Terms
                </Link>
                <Link href="/privacy" className="footer-bottom-link text-slate-200">
                  Privacy
                </Link>
                <Link href="/cookies" className="footer-bottom-link text-slate-200">
                  Cookies
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .footer-text-scale :is(h1, h2, h3, h4, h5, h6, p, a, li, span, label) {
          font-size: 0.8em !important;
        }

        .contact-number {
          font-size: 0.96em !important;
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slideInLeft {
          from {
            opacity: 0;
            transform: translateX(-30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .animate-fadeInUp {
          animation: fadeInUp 0.8s ease-out forwards;
        }

        .animate-slideInLeft {
          animation: slideInLeft 0.8s ease-out forwards;
        }

        .footer-link {
          position: relative;
          transition: all 0.3s ease;
        }

        .footer-link:after {
          content: '';
          position: absolute;
          width: 0;
          height: 1px;
          bottom: -2px;
          left: 0;
          background: #ef4444;
          transition: width 0.3s ease;
        }

        .footer-link:hover:after {
          width: 100%;
        }

        @media (min-width: 1024px) {
          .footer-shell {
            background-image: none !important;
            background-color: #f8fafc !important;
          }

          .footer-text-scale :is(h1, h2, h3, h4, h5, h6, p, a, li, span, label) {
            /* Keep ~20% smaller text on desktop too (base rule already does this). */
            font-size: 0.8em !important;
          }

          .footer-link:hover {
            transform: translateX(2px);
          }

          .footer-bottom-link {
            position: relative;
            transition: transform 0.2s ease, color 0.2s ease;
          }

          .footer-bottom-link:hover {
            color: #ffffff;
            transform: translateY(-1px);
          }
        }
      `}</style>
    </footer>
  );
}
