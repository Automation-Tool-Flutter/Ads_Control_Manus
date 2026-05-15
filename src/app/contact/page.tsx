"use client";

import Link from "next/link";
import { useRef } from "react";

const CONTACT_EMAIL = "info@newgame.studio";

export default function ContactPage() {
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const subjectRef = useRef<HTMLInputElement>(null);
  const messageRef = useRef<HTMLTextAreaElement>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const name = nameRef.current?.value.trim() ?? "";
    const email = emailRef.current?.value.trim() ?? "";
    const subject = subjectRef.current?.value.trim() ?? "";
    const message = messageRef.current?.value.trim() ?? "";

    const mailSubject = subject || `Contact from ${name || "user"}`;
    const mailBody = [
      name && `Name: ${name}`,
      email && `Email: ${email}`,
      "",
      message,
    ]
      .filter((l) => l)
      .join("\n");

    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(mailSubject)}&body=${encodeURIComponent(mailBody)}`;
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      <Link href="/" className="text-accent text-sm hover:underline">
        ← Back to home
      </Link>

      <h1 className="text-3xl font-bold text-text-primary mt-6 mb-2">
        Contact Us
      </h1>
      <p className="text-text-secondary text-base mb-8">
        Have a question or feedback? We&apos;d love to hear from you.
      </p>

      {/* Contact info card */}
      <div className="glass-card gradient-border-card rounded-2xl p-6 mb-8">
        <div className="flex flex-col sm:flex-row gap-6">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center text-accent flex-shrink-0">
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
                />
              </svg>
            </div>
            <div>
              <p className="text-xs text-text-muted mb-0.5 font-medium">
                Email
              </p>
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="text-sm text-accent hover:underline"
              >
                {CONTACT_EMAIL}
              </a>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center text-accent flex-shrink-0">
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div>
              <p className="text-xs text-text-muted mb-0.5 font-medium">
                Response time
              </p>
              <p className="text-sm text-text-secondary">
                Typically within 12–24 hours
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Contact form */}
      <div className="glass-card gradient-border-card rounded-2xl p-6">
        <h2 className="text-base font-semibold text-text-primary mb-5">
          Send us a message
        </h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-text-secondary">
                Name
              </label>
              <input
                ref={nameRef}
                type="text"
                placeholder="Your name"
                className="bg-bg-secondary border border-border rounded-xl px-3 py-2.5 text-sm text-text-primary w-full focus:outline-none focus:border-accent"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-text-secondary">
                Email
              </label>
              <input
                ref={emailRef}
                type="email"
                placeholder="your@email.com"
                className="bg-bg-secondary border border-border rounded-xl px-3 py-2.5 text-sm text-text-primary w-full focus:outline-none focus:border-accent"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-secondary">
              Subject{" "}
              <span className="text-text-muted font-normal">(optional)</span>
            </label>
            <input
              ref={subjectRef}
              type="text"
              placeholder="What is this about?"
              className="bg-bg-secondary border border-border rounded-xl px-3 py-2.5 text-sm text-text-primary w-full focus:outline-none focus:border-accent"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-secondary">
              Message
            </label>
            <textarea
              ref={messageRef}
              rows={5}
              placeholder="Tell us how we can help..."
              className="bg-bg-secondary border border-border rounded-xl px-3 py-2.5 text-sm text-text-primary w-full focus:outline-none focus:border-accent resize-none"
            />
          </div>
          <div>
            <button
              type="submit"
              className="bg-accent text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-accent/90 transition-colors text-sm"
            >
              Send Message
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
