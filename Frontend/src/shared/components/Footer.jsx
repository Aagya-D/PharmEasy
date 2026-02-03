import React from "react";
import { Link } from "react-router-dom";
import { Pill, Mail, Phone, MapPin } from "lucide-react";

/**
 * Footer Component - Healthcare-grade footer with enhanced styling
 * Features: Brand section, navigation links, contact info, copyright
 */
export function Footer() {
  return (
    <footer className="bg-slate-50 border-t border-slate-200 px-6 py-12 mt-16">
      <div className="max-w-7xl mx-auto">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          {/* Brand Section */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-cyan-600 rounded-lg flex items-center justify-center">
                <Pill className="text-white" size={18} />
              </div>
              <span className="text-lg font-bold text-slate-900">PharmEasy</span>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed mb-4">
              Making essential medicines accessible to everyone, everywhere. Your trusted healthcare partner.
            </p>
            <div className="flex gap-3">
              {/* Social links placeholder */}
              <a 
                href="#" 
                className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center hover:bg-cyan-600 hover:text-white transition-colors"
                aria-label="Facebook"
              >
                <span className="text-sm">f</span>
              </a>
              <a 
                href="#" 
                className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center hover:bg-cyan-600 hover:text-white transition-colors"
                aria-label="Twitter"
              >
                <span className="text-sm">𝕏</span>
              </a>
              <a 
                href="#" 
                className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center hover:bg-cyan-600 hover:text-white transition-colors"
                aria-label="LinkedIn"
              >
                <span className="text-sm">in</span>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-base font-semibold text-slate-900 mb-4">
              Quick Links
            </h4>
            <ul className="space-y-2">
              <li>
                <Link
                  to="/"
                  className="text-sm text-slate-600 hover:text-cyan-600 transition-colors"
                >
                  Home
                </Link>
              </li>
              <li>
                <Link
                  to="/login"
                  className="text-sm text-slate-600 hover:text-cyan-600 transition-colors"
                >
                  Sign In
                </Link>
              </li>
              <li>
                <Link
                  to="/register"
                  className="text-sm text-slate-600 hover:text-cyan-600 transition-colors"
                >
                  Sign Up
                </Link>
              </li>
              <li>
                <Link
                  to="/about"
                  className="text-sm text-slate-600 hover:text-cyan-600 transition-colors"
                >
                  About Us
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-base font-semibold text-slate-900 mb-4">
              Support
            </h4>
            <ul className="space-y-2">
              <li>
                <Link
                  to="/help"
                  className="text-sm text-slate-600 hover:text-cyan-600 transition-colors"
                >
                  Help Center
                </Link>
              </li>
              <li>
                <Link
                  to="/faq"
                  className="text-sm text-slate-600 hover:text-cyan-600 transition-colors"
                >
                  FAQ
                </Link>
              </li>
              <li>
                <Link
                  to="/privacy"
                  className="text-sm text-slate-600 hover:text-cyan-600 transition-colors"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  to="/terms"
                  className="text-sm text-slate-600 hover:text-cyan-600 transition-colors"
                >
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-base font-semibold text-slate-900 mb-4">
              Contact Us
            </h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-2 text-sm text-slate-600">
                <Mail size={16} className="mt-0.5 flex-shrink-0 text-cyan-600" />
                <span>support@pharmeasy.com</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-slate-600">
                <Phone size={16} className="mt-0.5 flex-shrink-0 text-cyan-600" />
                <span>+1 (555) 123-4567</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-slate-600">
                <MapPin size={16} className="mt-0.5 flex-shrink-0 text-cyan-600" />
                <span>123 Healthcare Ave<br />Medical District, MD 12345</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright Bar */}
        <div className="border-t border-slate-200 pt-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-slate-500 text-center md:text-left">
              © {new Date().getFullYear()} PharmEasy. All rights reserved. Academic project.
            </p>
            <p className="text-xs text-slate-400 text-center md:text-right">
              Developed for educational purposes. Not for commercial use.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
