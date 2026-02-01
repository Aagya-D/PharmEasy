# PharmEasy Frontend - Organized Structure

## 📁 Folder Organization

```
client/src/
├── pages/
│   ├── Landing.jsx                      # Public landing page
│   ├── NotificationCenter.jsx           # Global notifications
│   │
│   ├── auth/                            # Authentication pages (no auth required)
│   │   ├── Login.jsx                    # User login
│   │   ├── Register.jsx                 # User registration
│   │   ├── VerifyOtp.jsx               # OTP verification
│   │   ├── ForgotPassword.jsx          # Password reset request
│   │   └── ResetPassword.jsx           # Password reset confirmation
│   │
│   ├── patient/                         # Patient pages (roleId = 3)
│   │   ├── PatientPortal.jsx           # Patient dashboard
│   │   ├── SearchResults.jsx           # Medicine search results
│   │   └── EmergencySOS.jsx            # Emergency medicine request
│   │
│   ├── pharmacy/                        # Pharmacy pages (roleId = 2)
│   │   ├── PharmacyOnboarding.jsx      # Initial pharmacy registration
│   │   ├── PharmacyPendingApproval.jsx # Waiting for admin approval
│   │   └── PharmacyDashboard.jsx       # Verified pharmacy dashboard
│   │
│   └── admin/                           # Admin pages (roleId = 1)
│       └── AdminDashboard.jsx           # Admin verification dashboard
│
├── components/
│   ├── StateMonitor.jsx                 # Dev tool (Ctrl+Shift+L)
│   └── ... (existing components)
│
├── utils/
│   ├── logger.js                        # Application-wide logging
│   ├── auditor.js                       # State audit & security
│   └── pageStructure.js                 # Page organization reference
│
└── routes/
    ├── AppRoutes.jsx                    # Main route definitions
    ├── ProtectedRoute.jsx               # Auth protection
    └── EnhancedProtectedRoute.jsx       # Protection + logging
```

## 🎯 Access Rules

### Public Pages (No Auth)
- `/` - Landing
- `/login` - Login
- `/register` - Register
- `/verify-otp` - OTP Verification
- `/forgot-password` - Password Reset

### Patient Pages (roleId = 3, Auth Required)
- `/patient/portal` - Patient dashboard
- `/patient/search` - Search medicines
- `/patient/emergency` - Emergency SOS

### Pharmacy Pages (roleId = 2, Auth Required)
- `/pharmacy/onboard` - First-time registration
- `/pharmacy/pending` - Waiting for approval
- `/pharmacy/dashboard` - Verified pharmacy dashboard (requires VERIFIED status)

### Admin Pages (roleId = 1, Auth Required)
- `/admin/dashboard` - Admin approval dashboard

## 📊 State Monitoring

### Logger (`utils/logger.js`)
- Tracks all user actions
- Records API calls with response times
- Logs authentication events
- Exports logs as JSON

### Auditor (`utils/auditor.js`)
- Validates state transitions
- Enforces role-based access
- Detects security violations
- Records state history

### State Monitor Component (`components/StateMonitor.jsx`)
**Development Only** - Press `Ctrl+Shift+L` to toggle

Features:
- Real-time auth state
- Live log viewer
- Security violations tracker
- Export logs & audit data

## 🔐 Security Features

### AuthContext Integration
- Logger initialized with user context
- All auth actions logged
- State changes audited
- API calls tracked with timing

### Protected Routes
- Authentication verification
- Role-based access control
- Pharmacy verification status check
- Navigation auditing

### Audit Trail
- User actions logged
- State transitions recorded
- Security violations flagged
- Exportable for review

## 🛠️ Development Tools

### Keyboard Shortcuts
- `Ctrl+Shift+L` - Toggle State Monitor

### Console Access (Dev Mode)
```javascript
window.__logger.getLogs()        // Get all logs
window.__logger.exportLogs()     // Export as JSON
window.__auditor.getViolations() // Get security violations
window.__auditor.exportAudit()   // Export audit report
```

### Log Levels
- **Production**: WARN and ERROR only
- **Development**: DEBUG, INFO, WARN, ERROR
- **Test**: ERROR only

## 📝 Usage Examples

### Logging User Actions
```javascript
import logger from '../utils/logger';

logger.userAction('PHARMACY_ONBOARD_SUBMIT', { pharmacyName });
logger.pharmacyEvent('DOCUMENT_UPLOADED', { documentUrl });
logger.adminAction('APPROVE_PHARMACY', pharmacyId);
```

### Auditing State
```javascript
import auditor from '../utils/auditor';

auditor.auditAuth(user, 'LOGIN');
auditor.auditPharmacyOnboarding(user, pharmacy);
auditor.auditAdminAccess(user, 'APPROVE_PHARMACY');
```

### Performance Monitoring
```javascript
const timer = logger.startTimer('API_CALL');
// ... do work
timer.stop(); // Logs duration
```

## 🎓 Benefits for FYP

1. **Viva Defense**: Clear audit trail of all actions
2. **Debugging**: Comprehensive logging system
3. **Security**: Violation detection and reporting
4. **Professional**: Industry-standard logging practices
5. **Organized**: Clean folder structure by role/module
