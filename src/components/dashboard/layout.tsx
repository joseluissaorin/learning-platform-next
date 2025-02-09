"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { useState } from "react";
import { RobotMascot } from "../landing/robot-mascot";

interface Props {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: Props) {
  const { data: session } = useSession();
  const [isSidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="min-h-screen bg-base-200">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 transform bg-base-100 transition-transform duration-200 ease-in-out ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className="flex h-16 items-center border-b px-6">
          <Link href="/dashboard" className="flex items-center text-xl font-bold">
            <span className="text-blue-500">Conceptly</span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="space-y-1 px-3 py-4">
          <Link
            href="/dashboard"
            className="flex items-center rounded-lg px-3 py-2 text-sm font-medium hover:bg-base-200"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="mr-3 h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
            Dashboard
          </Link>
          <Link
            href="/dashboard/documents"
            className="flex items-center rounded-lg px-3 py-2 text-sm font-medium hover:bg-base-200"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor" 
              className="mr-3 h-6 w-6"
              strokeWidth="1.5"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                d="m7.875 14.25 1.214 1.942a2.25 2.25 0 0 0 1.908 1.058h2.006c.776 0 1.497-.4 1.908-1.058l1.214-1.942M2.41 9h4.636a2.25 2.25 0 0 1 1.872 1.002l.164.246a2.25 2.25 0 0 0 1.872 1.002h2.092a2.25 2.25 0 0 0 1.872-1.002l.164-.246A2.25 2.25 0 0 1 16.954 9h4.636M2.41 9a2.25 2.25 0 0 0-.16.832V12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 12V9.832c0-.287-.055-.57-.16-.832M2.41 9a2.25 2.25 0 0 1 .382-.632l3.285-3.832a2.25 2.25 0 0 1 1.708-.786h8.43c.657 0 1.281.287 1.709.786l3.284 3.832c.163.19.291.404.382.632M4.5 20.25h15A2.25 2.25 0 0 0 21.75 18v-2.625c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125V18a2.25 2.25 0 0 0 2.25 2.25Z" 
              />
            </svg>
            Sessions
          </Link>
          <Link
            href="/dashboard/learning"
            className="flex items-center rounded-lg px-3 py-2 text-sm font-medium hover:bg-base-200"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="mr-3 h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
            Learning
          </Link>
        </nav>
      </aside>

      {/* Main Content */}
      <div
        className={`min-h-screen transition-all duration-200 ${
          isSidebarOpen ? "pl-64" : "pl-0"
        }`}
      >
        {/* Header */}
        <header className="sticky top-0 z-40 border-b bg-background/50 backdrop-blur-xl backdrop-saturate-150 supports-[backdrop-filter]:bg-background/50">
          <div className="flex h-16 items-center px-6">
            <button
              onClick={() => setSidebarOpen(!isSidebarOpen)}
              className="btn-ghost btn-sm btn-circle btn"
              aria-label="Toggle sidebar"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>

            {/* User Menu */}
            <div className="ml-auto flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="avatar placeholder">
                  <div className="w-8 rounded-full bg-neutral text-neutral-content">
                    <span className="text-xs">
                      {session?.user?.name
                        ?.split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </span>
                  </div>
                </div>
                <span className="text-sm font-medium">{session?.user?.name}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
} 