/**
 * Email Service - Sends OTP and password reset emails
 * Uses Nodemailer for SMTP-based email delivery
 *
 * Configuration via environment:
 * - SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
 * - SMTP_FROM_EMAIL
 */

import nodemailer from "nodemailer";

// Initialize Nodemailer transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || "localhost",
  port: parseInt(process.env.EMAIL_PORT) || 1025,
  secure: process.env.EMAIL_PORT === "465",
  auth: process.env.EMAIL_USER
    ? {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      }
    : undefined,
});

const FROM_EMAIL = process.env.EMAIL_FROM || "noreply@pharmeasy.local";

/**
 * Send OTP Email
 * @param {string} email - recipient email
 * @param {string} otp - 6-digit OTP code
 * @param {string} name - user name
 */
export const sendOTPEmail = async (email, otp, name) => {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; background-color: #f4f4f4; }
          .container { max-width: 600px; margin: 20px auto; background: white; padding: 20px; border-radius: 8px; }
          .header { text-align: center; color: #333; margin-bottom: 20px; }
          .otp-box { 
            background-color: #007bff; 
            color: white; 
            padding: 20px; 
            border-radius: 8px; 
            text-align: center; 
            font-size: 32px; 
            font-weight: bold; 
            letter-spacing: 5px; 
            margin: 20px 0;
          }
          .footer { text-align: center; color: #999; font-size: 12px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>PharmEasy - Email Verification</h1>
          </div>
          <p>Hi ${name},</p>
          <p>Your OTP for PharmEasy email verification is:</p>
          <div class="otp-box">${otp}</div>
          <p>This OTP will expire in 10 minutes. Do not share this code with anyone.</p>
          <p>If you did not request this, please ignore this email.</p>
          <div class="footer">
            <p>&copy; 2025 PharmEasy. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  try {
    await transporter.sendMail({
      from: FROM_EMAIL,
      to: email,
      subject: "PharmEasy - Email Verification OTP",
      html: htmlContent,
    });
    return true;
  } catch (error) {
    console.error("Error sending OTP email:", error);
    throw new Error("Failed to send OTP email");
  }
};

/**
 * Send Password Reset Email
 * @param {string} email - recipient email
 * @param {string} resetToken - password reset token
 * @param {string} name - user name
 */
export const sendPasswordResetEmail = async (email, resetToken, name) => {
  const resetLink = `${process.env.FRONTEND_URL}/auth/reset-password?token=${resetToken}`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; background-color: #f4f4f4; }
          .container { max-width: 600px; margin: 20px auto; background: white; padding: 20px; border-radius: 8px; }
          .header { text-align: center; color: #333; margin-bottom: 20px; }
          .btn { 
            display: inline-block; 
            background-color: #007bff; 
            color: white; 
            padding: 12px 30px; 
            border-radius: 5px; 
            text-decoration: none; 
            margin: 20px 0;
          }
          .footer { text-align: center; color: #999; font-size: 12px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>PharmEasy - Password Reset</h1>
          </div>
          <p>Hi ${name},</p>
          <p>You requested a password reset for your PharmEasy account. Click the button below to reset your password:</p>
          <a href="${resetLink}" class="btn">Reset Password</a>
          <p>This link will expire in 1 hour. If you did not request this, please ignore this email.</p>
          <div class="footer">
            <p>&copy; 2025 PharmEasy. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  try {
    await transporter.sendMail({
      from: FROM_EMAIL,
      to: email,
      subject: "PharmEasy - Password Reset Request",
      html: htmlContent,
    });
    return true;
  } catch (error) {
    console.error("Error sending password reset email:", error);
    throw new Error("Failed to send password reset email");
  }
};

/**
 * Test email connection (for development)
 */
export const testEmailConnection = async () => {
  try {
    await transporter.verify();
    console.log("Email service is ready");
    return true;
  } catch (error) {
    console.error("Email service connection error:", error);
    return false;
  }
};
