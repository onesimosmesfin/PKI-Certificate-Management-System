# PKI Certificate Management Project Documentation

## 1. Project Overview

This project is a PKI certificate management platform with a Java Spring Boot backend and a React + Vite frontend. It supports identity-based access, certificate lifecycle management, audit logging, security monitoring, and user role-based workflows.

The current MVP focuses on the Admin and Auditor flows while preserving the rest of the working application.

## 2. Solution Stack

### Backend
- Java 25
- Spring Boot 4.0.3
- Maven
- Spring Security
- Spring Data JPA
- MySQL (XAMPP local database)
- PKCS#11 / SoftHSM integration
- JWT authentication

### Frontend
- React 19
- Vite
- JavaScript
- React Router
- Zustand state management
- Axios
- Tailwind-inspired UI styling

## 3. Repository Structure

- [project file/certificate-management-backend](project%20file/certificate-management-backend)
  - Main backend source code
  - Spring Boot application and REST controllers
- [project file/front](project%20file/front)
  - React application
  - landing page, login, dashboard, audit pages, and role-gated routes

## 4. Main Functional Areas

### Authentication and Authorization
- JWT-based login and refresh flow
- Role-based access for Admin, Auditor, CA Operator, and User
- Protected frontend routes and backend endpoint restrictions

### User Management
- User signup and approval flow
- Admin approval/rejection logic
- Default seeded users for testing

### Certificate Management
- Certificate lifecycle handling
- CSR generation and verification
- Key and certificate management
- CA-related operations

### Audit and Security
- Audit logs
- High-risk log review
- Security event monitoring
- Threat and log analysis pages

## 5. Roles

The application supports these roles:

- ADMIN
- AUDITOR
- CA_OPERATOR
- USER

For the MVP, the visible and enforced flows are centered on Admin and Auditor access.

## 6. Default Test Accounts

These users are seeded automatically when the backend starts:

- Username: admin
  - Password: admin123
  - Role: ADMIN
- Username: auditor
  - Password: auditor123
  - Role: AUDITOR

## 7. Environment Configuration

### MySQL / XAMPP
The backend is configured to connect to a local MySQL database:

- Host: localhost
- Port: 3306
- Database: pkicertificatemanagement
- Username: root
- Password: empty

Relevant config file:
- [project file/certificate-management-backend/src/main/resources/application.properties](project%20file/certificate-management-backend/src/main/resources/application.properties)

### SoftHSM / PKCS#11
The project expects the local SoftHSM installation to be available for PKI operations.

Relevant config values are defined in:
- [project file/certificate-management-backend/src/main/resources/application.properties](project%20file/certificate-management-backend/src/main/resources/application.properties)

## 8. Backend Startup

From the backend directory:

```powershell
cd "C:\Users\Administrator\OneDrive\Desktop\project file2\project file\certificate-management-backend"
.\mvnw.cmd spring-boot:run
```

The backend runs on port 8081 by default.

## 9. Frontend Startup

From the frontend directory:

```powershell
cd "C:\Users\Administrator\OneDrive\Desktop\project file2\project file\front"
npm install
npm run dev -- --host 0.0.0.0
```

The frontend is served on:

- http://localhost:5173/

## 10. Main Application Files

### Backend
- [project file/certificate-management-backend/src/main/java/org/insa/pki/certificatemanagement/certificateManagmentBackend/config/DataInitializer.java](project%20file/certificate-management-backend/src/main/java/org/insa/pki/certificatemanagement/certificateManagmentBackend/config/DataInitializer.java)
  - Creates default seeded users
- [project file/certificate-management-backend/src/main/java/org/insa/pki/certificatemanagement/certificateManagmentBackend/config/WebSecurityConfig.java](project%20file/certificate-management-backend/src/main/java/org/insa/pki/certificatemanagement/certificateManagmentBackend/config/WebSecurityConfig.java)
  - Enforces API-level role restrictions
- [project file/certificate-management-backend/src/main/java/org/insa/pki/certificatemanagement/certificateManagmentBackend/controller/AuthController.java](project%20file/certificate-management-backend/src/main/java/org/insa/pki/certificatemanagement/certificateManagmentBackend/controller/AuthController.java)
  - Login and auth endpoints
- [project file/certificate-management-backend/src/main/java/org/insa/pki/certificatemanagement/certificateManagmentBackend/model/UserEntity.java](project%20file/certificate-management-backend/src/main/java/org/insa/pki/certificatemanagement/certificateManagmentBackend/model/UserEntity.java)
  - User entity and required fields

### Frontend
- [project file/front/src/App.jsx](project%20file/front/src/App.jsx)
  - Route configuration and protected pages
- [project file/front/src/pages/login.jsx](project%20file/front/src/pages/login.jsx)
  - Login form and role-based redirect
- [project file/front/src/pages/dashboard/AuditLogs.jsx](project%20file/front/src/pages/dashboard/AuditLogs.jsx)
  - Audit log dashboard UI
- [project file/front/src/components/auth/ProtectedRoute.jsx](project%20file/front/src/components/auth/ProtectedRoute.jsx)
  - Route authorization guard

## 11. Known Operational Notes

- Port 8081 must be free before starting the backend.
- XAMPP MySQL must be running for the app to connect successfully.
- If SoftHSM is not configured or available, PKCS#11 features may fail in the application.
- This project was validated with a backend compile and a successful live login response for the admin account.

## 12. Verification Status

The latest validation confirmed:

- Backend startup succeeds after fixing the default user-email initialization bug
- Admin login returns a valid access token from the live API
- Frontend build also succeeded during previous validation

## 13. Usage Summary

1. Start XAMPP MySQL.
2. Start the backend.
3. Start the frontend.
4. Log in with the admin or auditor default account.
5. Navigate to the dashboard and use the role-scoped views.

---

This documentation reflects the actual current project structure and behavior as verified in the workspace.
