import {
  ArrowRight,
  Bell,
  CalendarDays,
  Check,
  CircleDollarSign,
  FileText,
  Gavel,
  MessageSquareText,
  ShieldCheck,
  Users,
  Video,
} from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { getCanonicalUrl, seoConfig } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Legal Practice Management Platform",
  description:
    "Run legal operations in one workspace with case tracking, document workflows, billing, and hearing reminders.",
  alternates: {
    canonical: getCanonicalUrl("/"),
  },
  openGraph: {
    title: "Vidhigya - Legal Practice Management Platform",
    description:
      "A modern platform for lawyers and law firms to manage cases, clients, documents, billing, and collaboration.",
    url: getCanonicalUrl("/"),
    siteName: seoConfig.siteName,
    locale: seoConfig.locale,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Vidhigya - Legal Practice Management Platform",
    description:
      "Manage your legal operations from one secure platform built for law firms and solo practitioners.",
  },
};

const platformHighlights = [
  "Case lifecycle management from intake to closure",
  "Integrated billing, subscriptions, and seat governance",
  "Calendar, hearing schedules, and task automation",
  "Client collaboration with notifications and document access",
];

const features = [
  {
    title: "Case & Client Operations",
    description:
      "Organize matters, assign counsel, track statuses, priorities, notes, and client communication from a single workspace.",
    icon: Gavel,
  },
  {
    title: "Smart Documents",
    description:
      "Upload, search, query, and manage legal documents with AI-supported retrieval and history for faster drafting and review.",
    icon: FileText,
  },
  {
    title: "Billing & Subscriptions",
    description:
      "Create bills, monitor payments, flag overdue amounts, and manage subscription-linked team seat limits with clarity.",
    icon: CircleDollarSign,
  },
  {
    title: "Calendar & Hearings",
    description:
      "Manage hearings and events, schedule reminders, and sync workflows so your team never misses court-critical dates.",
    icon: CalendarDays,
  },
  {
    title: "Video Calls & Collaboration",
    description:
      "Run scheduled and instant consultations, keep teams aligned through in-app chat, and coordinate matters in real time.",
    icon: Video,
  },
  {
    title: "Admin, Reports & Permissions",
    description:
      "Use role-aware access controls, practice-level administration, analytics dashboards, and audit-friendly operations.",
    icon: ShieldCheck,
  },
];

const personaRows = [
  {
    role: "Solo Lawyers",
    useCase:
      "Handle cases, hearings, tasks, and billing without juggling disconnected tools.",
  },
  {
    role: "Law Firms",
    useCase:
      "Collaborate across partners, associates, and paralegals with seat-based team governance.",
  },
  {
    role: "Legal Admin Teams",
    useCase:
      "Control users, monitor subscriptions, enforce policies, and report on performance.",
  },
  {
    role: "Clients",
    useCase:
      "Stay informed through updates, documents, and billing visibility in a structured portal.",
  },
];

const plans = [
  {
    name: "Starter",
    price: "INR 2,499/mo",
    seats: "Up to 5 team members",
    cta: "Start Starter",
    recommended: false,
    items: [
      "Case, task, and calendar management",
      "Client and document workflows",
      "Basic billing and payment tracking",
      "Email and in-app notifications",
    ],
  },
  {
    name: "Growth",
    price: "INR 5,999/mo",
    seats: "Up to 20 team members",
    cta: "Choose Growth",
    recommended: true,
    items: [
      "Everything in Starter",
      "Advanced billing and subscription controls",
      "Video calls and team collaboration",
      "Expanded reports and productivity analytics",
    ],
  },
  {
    name: "Enterprise",
    price: "Custom pricing",
    seats: "Custom seat limits",
    cta: "Talk to Sales",
    recommended: false,
    items: [
      "Everything in Growth",
      "Tailored onboarding and migration support",
      "Custom compliance and permission workflows",
      "Priority support and account management",
    ],
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <main>
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-blue-100/60 via-transparent to-transparent dark:from-blue-900/20" />
          <div className="relative mx-auto max-w-7xl px-4 pb-16 pt-16 sm:px-6 lg:px-8 lg:pt-24">
            <div className="mx-auto max-w-3xl text-center">
              <p className="inline-flex items-center rounded-full border border-border bg-card px-3 py-1 text-sm">
                Legal practice management for modern teams
              </p>
              <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl">
                Run your legal operations in one platform
              </h1>
              <p className="mt-5 text-lg text-muted-foreground">
                Vidhigya brings together cases, clients, documents, billing,
                hearings, team collaboration, and practice administration so your
                firm can move faster with confidence.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link href="/register" className="btn-primary inline-flex items-center">
                  Start free onboarding <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
                <Link href="/login" className="btn-outline">
                  Explore with demo login
                </Link>
              </div>
            </div>

            <div className="mt-10 grid gap-3 sm:grid-cols-2">
              {platformHighlights.map((item) => (
                <div
                  key={item}
                  className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground"
                >
                  <span className="mr-2 inline-flex rounded-full bg-green-100 p-1 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                    <Check className="h-3.5 w-3.5" />
                  </span>
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-bold">Everything your legal team uses daily</h2>
            <p className="mt-3 text-muted-foreground">
              Purpose-built modules cover the full legal workflow across matter
              delivery, internal operations, and client service.
            </p>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <article
                  key={feature.title}
                  className="rounded-2xl border border-border bg-card p-6 shadow-sm"
                >
                  <div className="inline-flex rounded-lg bg-blue-100 p-2 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold">{feature.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="border-y border-border bg-muted/40">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
            <div className="grid gap-8 lg:grid-cols-2">
              <div>
                <h2 className="text-3xl font-bold">Designed for every legal role</h2>
                <p className="mt-3 text-muted-foreground">
                  From solo counsel to multi-office firms, Vidhigya supports role
                  specific workflows and permission-based access.
                </p>
                <div className="mt-6 space-y-3">
                  {personaRows.map((persona) => (
                    <div
                      key={persona.role}
                      className="rounded-xl border border-border bg-background p-4"
                    >
                      <p className="font-medium">{persona.role}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {persona.useCase}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl border border-border bg-card p-6">
                <h3 className="text-xl font-semibold">Core workflows included</h3>
                <ul className="mt-5 space-y-4 text-sm text-muted-foreground">
                  <li className="flex items-start gap-3">
                    <Users className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                    Practice and member management with configurable seat limits
                  </li>
                  <li className="flex items-start gap-3">
                    <MessageSquareText className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                    Team chats for case coordination and fast handoffs
                  </li>
                  <li className="flex items-start gap-3">
                    <Bell className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                    Notification center with read-tracking and reminder workflows
                  </li>
                  <li className="flex items-start gap-3">
                    <CircleDollarSign className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                    Subscription and billing controls with clear renewal actions
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section id="pricing" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold">Pricing plans</h2>
            <p className="mt-3 text-muted-foreground">
              Choose a plan based on your team size and operational complexity.
              Upgrade anytime as your practice grows.
            </p>
          </div>
          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-2xl border p-6 ${
                  plan.recommended
                    ? "border-blue-500 bg-blue-50/50 shadow-lg dark:bg-blue-900/10"
                    : "border-border bg-card"
                }`}
              >
                {plan.recommended && (
                  <p className="inline-flex rounded-full bg-blue-600 px-3 py-1 text-xs font-medium text-white">
                    Most popular
                  </p>
                )}
                <h3 className="mt-3 text-xl font-semibold">{plan.name}</h3>
                <p className="mt-2 text-3xl font-bold">{plan.price}</p>
                <p className="mt-1 text-sm text-muted-foreground">{plan.seats}</p>
                <ul className="mt-6 space-y-2 text-sm text-muted-foreground">
                  {plan.items.map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                      {item}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/register"
                  className={`mt-6 inline-flex w-full items-center justify-center rounded-lg px-4 py-2 text-sm font-medium ${
                    plan.recommended
                      ? "bg-blue-600 text-white hover:bg-blue-700"
                      : "border border-border bg-background hover:bg-muted"
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </section>

        <section className="border-t border-border bg-card">
          <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
            <div className="flex flex-col items-start justify-between gap-5 rounded-2xl border border-border bg-background p-8 lg:flex-row lg:items-center">
              <div>
                <h2 className="text-2xl font-bold">
                  Ready to modernize your legal practice?
                </h2>
                <p className="mt-2 text-muted-foreground">
                  Start with your preferred plan and onboard your team in minutes.
                </p>
              </div>
              <div className="flex gap-3">
                <Link href="/register" className="btn-primary">
                  Create account
                </Link>
                <Link href="/login" className="btn-outline">
                  Sign in
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
