import React from "react";
import { Link } from "react-router-dom";

/**
 * Footer Component
 * Minimal footer with links and copyright
 */
export function Footer() {
  return (
    <footer
      style={{
        backgroundColor: "var(--color-bg-secondary)",
        borderTop: "1px solid var(--color-border)",
        padding: "var(--spacing-2xl) var(--spacing-xl)",
        marginTop: "var(--spacing-3xl)",
      }}
    >
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "var(--spacing-xl)",
          marginBottom: "var(--spacing-2xl)",
        }}
      >
        {/* Brand */}
        <div>
          <div
            style={{
              fontSize: "var(--font-size-lg)",
              fontWeight: "var(--font-weight-bold)",
              color: "var(--color-primary)",
              marginBottom: "var(--spacing-sm)",
            }}
          >
            PharmEasy
          </div>
          <p
            style={{
              fontSize: "var(--font-size-sm)",
              color: "var(--color-text-secondary)",
              lineHeight: "var(--line-height-relaxed)",
            }}
          >
            Making essential medicines accessible to everyone, everywhere.
          </p>
        </div>

        {/* Quick Links */}
        <div>
          <h4
            style={{
              fontSize: "var(--font-size-base)",
              fontWeight: "var(--font-weight-semibold)",
              color: "var(--color-text-primary)",
              marginBottom: "var(--spacing-md)",
            }}
          >
            Quick Links
          </h4>
          <ul style={{ listStyle: "none" }}>
            <li style={{ marginBottom: "var(--spacing-sm)" }}>
              <Link
                to="/"
                style={{
                  fontSize: "var(--font-size-sm)",
                  color: "var(--color-text-secondary)",
                  textDecoration: "none",
                  transition: "color var(--transition-fast)",
                }}
                onMouseEnter={(e) =>
                  (e.target.style.color = "var(--color-primary)")
                }
                onMouseLeave={(e) =>
                  (e.target.style.color = "var(--color-text-secondary)")
                }
              >
                Home
              </Link>
            </li>
            <li style={{ marginBottom: "var(--spacing-sm)" }}>
              <Link
                to="/login"
                style={{
                  fontSize: "var(--font-size-sm)",
                  color: "var(--color-text-secondary)",
                  textDecoration: "none",
                  transition: "color var(--transition-fast)",
                }}
                onMouseEnter={(e) =>
                  (e.target.style.color = "var(--color-primary)")
                }
                onMouseLeave={(e) =>
                  (e.target.style.color = "var(--color-text-secondary)")
                }
              >
                Sign In
              </Link>
            </li>
            <li>
              <Link
                to="/register"
                style={{
                  fontSize: "var(--font-size-sm)",
                  color: "var(--color-text-secondary)",
                  textDecoration: "none",
                  transition: "color var(--transition-fast)",
                }}
                onMouseEnter={(e) =>
                  (e.target.style.color = "var(--color-primary)")
                }
                onMouseLeave={(e) =>
                  (e.target.style.color = "var(--color-text-secondary)")
                }
              >
                Sign Up
              </Link>
            </li>
          </ul>
        </div>

        {/* About */}
        <div>
          <h4
            style={{
              fontSize: "var(--font-size-base)",
              fontWeight: "var(--font-weight-semibold)",
              color: "var(--color-text-primary)",
              marginBottom: "var(--spacing-md)",
            }}
          >
            About
          </h4>
          <p
            style={{
              fontSize: "var(--font-size-sm)",
              color: "var(--color-text-secondary)",
              lineHeight: "var(--line-height-normal)",
            }}
          >
            PharmEasy is an academic project designed to solve real-world
            medicine availability challenges.
          </p>
        </div>
      </div>

      {/* Copyright */}
      <div
        style={{
          borderTop: "1px solid var(--color-border)",
          paddingTop: "var(--spacing-lg)",
          textAlign: "center",
        }}
      >
        <p
          style={{
            fontSize: "var(--font-size-sm)",
            color: "var(--color-text-tertiary)",
          }}
        >
          © 2025 PharmEasy. All rights reserved. Academic project.
        </p>
      </div>
    </footer>
  );
}

export default Footer;
