'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Clock3, Facebook, Instagram, Linkedin, Mail, MapPin, Phone, Send, Youtube } from 'lucide-react';

export default function HelpCenterPage() {
  return <HelpCenterContactRedesign />;
}

function HelpCenterContactRedesign() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
  });

  const handleWhatsAppRedirect = (e: React.FormEvent) => {
    e.preventDefault();
    const { name, email, phone, subject, message } = formData;
    const text = `*New Help Center Message*\n\n*Name:* ${name}\n*Email:* ${email}\n*Phone:* ${phone}\n*Subject:* ${subject || 'General Enquiry'}\n\n*Message:*\n${message}`;
    const encodedText = encodeURIComponent(text);
    window.open(`https://wa.me/917015150181?text=${encodedText}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-[#f0f4ff]">
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(900px_circle_at_15%_20%,rgba(59,109,212,0.22),transparent_55%),radial-gradient(900px_circle_at_85%_10%,rgba(59,109,212,0.14),transparent_55%)]" />
        <div className="mx-auto w-full max-w-7xl px-4 pb-6 pt-10 sm:px-6 sm:pb-10 sm:pt-12 lg:px-8">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#3B6DD4]">Help Center</p>
              <h1 className="mt-3 text-4xl font-extrabold leading-tight tracking-[-0.04em] text-slate-950 sm:text-5xl">
                We&apos;d Love to Hear
                <span className="block bg-gradient-to-r from-[#3B6DD4] to-[#2F58B3] bg-clip-text text-transparent">
                  From You!
                </span>
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-6 text-slate-600 sm:text-base">
                Have a question about your store, account, subscription, or marketplace setup? Share your details and we&apos;ll
                respond as soon as possible.
              </p>

              <div className="mt-7 flex flex-wrap gap-2">
                {['Quick Response', 'Expert Support', 'Trusted Partner'].map((label) => (
                  <span
                    key={label}
                    className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-800 shadow-sm"
                  >
                    {label}
                  </span>
                ))}
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/contact"
                  className="inline-flex items-center justify-center rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-900"
                >
                  Contact page
                </Link>
                <a
                  href="tel:7015150181"
                  className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50"
                >
                  Call: 7015150181
                </a>
              </div>
            </div>

            <div className="relative">
              <div className="absolute -right-10 -top-14 hidden h-44 w-44 rounded-full bg-[#3B6DD4]/10 blur-2xl lg:block" />
              <div className="rounded-[12px] border border-slate-200 bg-white p-7 shadow-[0_18px_60px_-45px_rgba(15,23,42,0.45)]">
                <div className="flex items-center gap-3">
                  <div className="grid h-12 w-12 place-items-center rounded-[12px] bg-[#3B6DD4] text-white shadow-sm">
                    <Mail className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Larawans support</p>
                    <p className="text-xs text-slate-600">Contact Larawans for assistance</p>
                  </div>
                </div>
                <div className="mt-6 space-y-3 text-sm text-slate-700">
                  <p>
                    Email:{' '}
                    <a className="font-semibold text-[#3B6DD4] hover:underline" href="mailto:info@larawans.com">
                      info@larawans.com
                    </a>
                  </p>
                  <p>
                    WhatsApp:{' '}
                    <a className="font-semibold text-[#3B6DD4] hover:underline" href="https://wa.me/917015150181">
                      +91 70151 50181
                    </a>
                  </p>
                  <p className="text-xs text-slate-500">
                    Tip: include your store name/ID, screenshot (if any), and the exact step where it breaks.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <div className="rounded-[12px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-xl font-semibold tracking-[-0.03em] text-slate-950">Get in Touch</h2>
            <p className="mt-1 text-sm text-slate-500">Fill the form and we&apos;ll get back soon.</p>

            <form className="mt-6 grid gap-4" onSubmit={handleWhatsAppRedirect}>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold text-slate-700">Full Name</label>
                  <input
                    required
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-0 transition focus:border-[#3B6DD4] focus:ring-2 focus:ring-[#3B6DD4]/15"
                    placeholder="Enter your full name"
                    autoComplete="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700">Email Address</label>
                  <input
                    required
                    type="email"
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-0 transition focus:border-[#3B6DD4] focus:ring-2 focus:ring-[#3B6DD4]/15"
                    placeholder="Enter your email"
                    autoComplete="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold text-slate-700">Phone Number</label>
                  <input
                    required
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-0 transition focus:border-[#3B6DD4] focus:ring-2 focus:ring-[#3B6DD4]/15"
                    placeholder="Enter your phone number"
                    autoComplete="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700">Subject</label>
                  <select
                    required
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-0 transition focus:border-[#3B6DD4] focus:ring-2 focus:ring-[#3B6DD4]/15"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  >
                    <option value="">Select subject</option>
                    <option value="store">Store setup</option>
                    <option value="billing">Billing / subscription</option>
                    <option value="account">Account access</option>
                    <option value="bug">Bug report</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">Message</label>
                <textarea
                  required
                  className="mt-1 min-h-[140px] w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-0 transition focus:border-[#3B6DD4] focus:ring-2 focus:ring-[#3B6DD4]/15"
                  placeholder="Write your message here..."
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                />
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-xl bg-[#3B6DD4] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#2F58B3]"
                >
                  <Send className="h-4 w-4" />
                  Send via WhatsApp
                </button>
                <p className="text-xs text-slate-500">
                  Form details will be sent to our support WhatsApp number.
                </p>
              </div>
            </form>
          </div>

          <div className="space-y-6">
            <div className="rounded-[12px] border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
              <h3 className="text-base font-semibold text-slate-950">Contact Information</h3>
              <div className="mt-5 space-y-4 text-sm text-slate-700">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 grid h-10 w-10 place-items-center rounded-[12px] bg-[#f0f4ff] text-[#3B6DD4] ring-1 ring-[#3B6DD4]/10">
                    <MapPin className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-900">Company Address</p>
                    <p className="mt-0.5 text-sm font-semibold text-slate-800">Registered Office</p>
                    <p className="mt-0.5 text-sm text-slate-600">
                      M/s Larawans, District Jind, Haryana - 126102
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 grid h-10 w-10 place-items-center rounded-[12px] bg-[#f0f4ff] text-[#3B6DD4] ring-1 ring-[#3B6DD4]/10">
                    <MapPin className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-900">Working Office</p>
                    <p className="mt-0.5 text-sm text-slate-600">
                      Shop No. 2, Subhash Market, Karnal Rd, Opp. District Court, Ashoka Garden Colony, Kaithal, Haryana - 136027 - India
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 grid h-10 w-10 place-items-center rounded-[12px] bg-[#f0f4ff] text-[#3B6DD4] ring-1 ring-[#3B6DD4]/10">
                    <Phone className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-900">Phone Number</p>
                    <div className="mt-1 space-y-1 text-sm text-slate-600">
                      <a className="block hover:underline" href="tel:+917015150181">+91-7015150181</a>
                      <a className="block hover:underline" href="tel:+919812456777">+91-9812456777</a>
                      <a className="block hover:underline" href="tel:+918930722686">+91-8930722686</a>
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 grid h-10 w-10 place-items-center rounded-[12px] bg-[#f0f4ff] text-[#3B6DD4] ring-1 ring-[#3B6DD4]/10">
                    <Mail className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-900">Email Address</p>
                    <a className="mt-0.5 block text-sm text-slate-600 hover:underline" href="mailto:info@larawans.com">
                      info@larawans.com
                    </a>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 grid h-10 w-10 place-items-center rounded-[12px] bg-[#f0f4ff] text-[#3B6DD4] ring-1 ring-[#3B6DD4]/10">
                    <Clock3 className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-900">Working Hours</p>
                    <p className="mt-0.5 text-sm text-slate-600">Mon–Sat: 10:00 AM – 7:00 PM</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[12px] border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
              <h3 className="text-base font-semibold text-slate-950">Follow Us</h3>
              <div className="mt-4 flex flex-wrap gap-3">
                <a
                  href="#"
                  className="inline-flex h-11 w-11 items-center justify-center rounded-[12px] border border-slate-200 bg-white text-slate-700 transition hover:border-[#3B6DD4]/40 hover:bg-[#f0f4ff]"
                  aria-label="Facebook"
                >
                  <Facebook className="h-5 w-5" />
                </a>
                <a
                  href="#"
                  className="inline-flex h-11 w-11 items-center justify-center rounded-[12px] border border-slate-200 bg-white text-slate-700 transition hover:border-[#3B6DD4]/40 hover:bg-[#f0f4ff]"
                  aria-label="Instagram"
                >
                  <Instagram className="h-5 w-5" />
                </a>
                <a
                  href="#"
                  className="inline-flex h-11 w-11 items-center justify-center rounded-[12px] border border-slate-200 bg-white text-slate-700 transition hover:border-[#3B6DD4]/40 hover:bg-[#f0f4ff]"
                  aria-label="YouTube"
                >
                  <Youtube className="h-5 w-5" />
                </a>
                <a
                  href="#"
                  className="inline-flex h-11 w-11 items-center justify-center rounded-[12px] border border-slate-200 bg-white text-slate-700 transition hover:border-[#3B6DD4]/40 hover:bg-[#f0f4ff]"
                  aria-label="LinkedIn"
                >
                  <Linkedin className="h-5 w-5" />
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 overflow-hidden rounded-[12px] border border-slate-200 bg-white shadow-sm">
          <div className="px-6 py-5 sm:px-8">
            <h3 className="text-base font-semibold text-slate-950">Find us on map</h3>
            <p className="mt-1 text-sm text-slate-500">Location preview for support &amp; office reference.</p>
          </div>
          <div className="h-[320px] w-full bg-slate-100">
            <iframe
              title="Map"
              className="h-full w-full"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              src="https://www.google.com/maps?q=Kaithal%2C%20Haryana%2C%20India&output=embed"
            />
          </div>
        </div>
      </section>
    </div>
  );
}
