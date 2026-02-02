import React from "react";
import { Link } from "react-router-dom";

/**
 * Footer Component
 * Minimal footer with links and copyright
 */
export function Footer() {
  return (
    <footer
      className="bg-[var(--color-bg-secondary)] border-t border-[var(--color-border)] px-6 py-12 mt-16"
    >
      <div
        className="max-w-[1200px] mx-auto grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-6 mb-12"
      >
        {/* Brand */}
        <div>
          <div
            className="text-lg font-bold text-[var(--color-primary)] mb-2"
          >
            PharmEasy
          </div>
          <p
            className="text-sm text-[var(--color-text-secondary)] leading-relaxed"
          >
            Making essential medicines accessible to everyone, everywhere.
          </p>
        </div>

        {/* Quick Links */}
        <div>
          <h4
            className="text-base font-semibold text-[var(--color-text-primary)] mb-4"
          >
            Quick Links
          </h4>
          <ul className="list-none">
            <li className="mb-2">
              <Link
                to="/"
                className="text-sm text-[var(--color-text-secondary)] no-underline transition-colors hover:text-[var(--color-primary)]"
              >
                Home
              </Link>
            </li>
            <li className="mb-2">
              <Link
                to="/login"
                className="text-sm text-[var(--color-text-secondary)] no-underline transition-colors hover:text-[var(--color-primary)]"
              >
                Sign In
              </Link>
            </li>
            <li>
              <Link
                to="/register"
                className="text-sm text-[var(--color-text-secondary)] no-underline transition-colors hover:text-[var(--color-primary)]"
              >
                Sign Up
              </Link>
            </li>
          </ul>
        </div>

        {/* About */}
        <div>
          <h4
            className="text-base font-semibold text-[var(--color-text-primary)] mb-4"
          >
            About
          </h4>
          <p
            className="text-sm text-[var(--color-text-secondary)] leading-normal"
          >
            PharmEasy is an academic project designed to solve real-world
            medicine availability challenges.
          </p>
        </div>
      </div>

      {/* Copyright */}
      <div
        className="border-t border-[var(--color-border)] pt-6 text-center"
      >
        <p
          className="text-sm text-[var(--color-text-tertiary)]"
        >
          © 2025 PharmEasy. All rights reserved. Academic project.
        </p>
      </div>
    </footer>
  );
}

export default Footer;
