# J&S Accounting BD - Production Ready

A complete production-ready construction accounting and management system for Bangladesh, built with React, Node.js, and PostgreSQL.

![Bangladesh](https://img.shields.io/badge/Bangladesh-%F0%9F%87%A7%F0%9F%87%A9-green)
![Currency](https://img.shields.io/badge/Currency-BDT%20(%E0%A7%B3)-blue)
![License](https://img.shields.io/badge/License-GPL--3.0-orange)

## Features

### Core Features
- **Authentication System** - JWT-based authentication with secure login
- **Role-Based Access Control** - Director, Manager, and Engineer roles
- **Multi-Currency Support** - BDT (default), USD, EUR, INR, and more
- **Dashboard** - Real-time analytics with charts and summaries

### Construction Management
- **Projects** - Create and manage construction projects
- **Transactions** - Track income and expenses
- **Workers** - Manage worker information and rates
- **Labor Payments** - Track worker payments
- **Invoices** - Generate and manage invoices

### Photo Management
- **Receipt Upload** - Upload and store receipt photos
- **Handwriting Notes** - Upload handwritten notes
- **Site Photos** - Store construction site photos
- **OCR Support** - Extract text from photos

### Backup & Sync
- **Google Drive Integration** - Automatic backup to Google Drive
- **Background Sync** - Automatic data synchronization
- **Manual Export** - Export data as JSON
- **Data Import** - Import data from backups

### Reports & Analytics
- **Financial Reports** - Income, expense, and profit reports
- **Charts** - Monthly and category-wise charts
- **Budget Planning** - Project budget management
- **Alerts** - Overdue invoices and budget alerts

## Tech Stack

### Backend
- **Node.js** + **Express.js** - REST API
- **PostgreSQL** - Database (Neon)
- **JWT** - Authentication
- **Multer** - File uploads
- **Google APIs** - Google Drive integration
- **node-cron** - Background jobs

### Frontend
- **React 18** - UI framework
- **React Router** - Navigation
- **TanStack Query** - Data fetching
- **Zustand** - State management
- **Tailwind CSS** - Styling
- **Recharts** - Charts
- **React Dropzone** - File uploads

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL database (Neon recommended)
- Google Cloud Console account (for Drive backup)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/sabujdotnet/js-account.git
cd js-account
```

2. **Install dependencies**
```bash
npm run install:all
```

3. **Configure environment variables**
```bash
cp server/.env.example server/.env
# Edit server/.env with your configuration
```

4. **Run database migrations**
```bash
npm run migrate
```

5. **Seed initial data**
```bash
npm run seed
```

6. **Start development server**
```bash
npm run dev
```

The app will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001

## Demo Accounts

After seeding, you can login with these accounts:

| Role | Email | Password |
|------|-------|----------|
| Director | admin@jsaccounting.com | admin123 |
| Manager | manager@jsaccounting.com | manager123 |
| Engineer | engineer@jsaccounting.com | engineer123 |

## Deployment

### Deploy to Render

1. **Fork this repository** to your GitHub account

2. **Create a Blueprint instance on Render**
   - Go to [Render Dashboard](https://dashboard.render.com)
   - Click "Blueprints"
   - Connect your GitHub repository
   - Render will automatically detect `render.yaml`

3. **Set environment variables** in Render dashboard:
   - `DATABASE_URL` - Your Neon PostgreSQL URL
   - `GOOGLE_CLIENT_ID` - From Google Cloud Console
   - `GOOGLE_CLIENT_SECRET` - From Google Cloud Console

4. **Deploy** - Render will automatically deploy both frontend and backend

### Deploy to Other Platforms

#### Backend (Any Node.js host)
```bash
cd server
npm install
npm start
```

#### Frontend (Static hosting)
```bash
cd client
npm install
npm run build
# Deploy build/ folder to Netlify, Vercel, etc.
```

## Environment Variables

### Server (.env)

```env
# Database
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d

# Server
PORT=3001
NODE_ENV=production
CLIENT_URL=https://your-frontend-url.com

# Google Drive
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=https://your-api.com/api/backup/google/callback
```

### Client (.env)

```env
REACT_APP_API_URL=https://your-api-url.com
```

## Project Structure

```
js-account-prod/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── pages/          # Page components
│   │   ├── hooks/          # Custom hooks
│   │   ├── services/       # API services
│   │   ├── utils/          # Utilities
│   │   └── context/        # React contexts
│   └── public/
├── server/                 # Node.js backend
│   ├── src/
│   │   ├── routes/         # API routes
│   │   ├── middleware/     # Express middleware
│   │   ├── services/       # Business logic
│   │   ├── config/         # Configuration
│   │   └── utils/          # Utilities
│   └── uploads/            # Uploaded files
├── render.yaml             # Render deployment config
└── README.md
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Register
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update profile
- `POST /api/auth/change-password` - Change password

### Users (Manager+)
- `GET /api/users` - List users
- `POST /api/users` - Create user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### Transactions
- `GET /api/transactions` - List transactions
- `POST /api/transactions` - Create transaction
- `PUT /api/transactions/:id` - Update transaction
- `DELETE /api/transactions/:id` - Delete transaction

### Projects
- `GET /api/projects` - List projects
- `POST /api/projects` - Create project
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project

### Photos
- `GET /api/photos` - List photos
- `POST /api/photos/upload` - Upload photos
- `DELETE /api/photos/:id` - Delete photo

### Dashboard
- `GET /api/dashboard/summary` - Dashboard summary
- `GET /api/dashboard/charts/monthly` - Monthly chart data
- `GET /api/dashboard/charts/category` - Category chart data

### Backup
- `GET /api/backup/status` - Backup status
- `GET /api/backup/google/auth` - Google Drive auth URL
- `POST /api/backup/google/backup` - Backup to Google Drive
- `POST /api/backup/export` - Export data

## Role Permissions

| Feature | Director | Manager | Engineer |
|---------|----------|---------|----------|
| View Dashboard | ✅ | ✅ | ✅ |
| Manage Transactions | ✅ | ✅ | ✅ |
| Manage Projects | ✅ | ✅ | ✅ |
| Manage Workers | ✅ | ✅ | ✅ |
| Manage Invoices | ✅ | ✅ | ✅ |
| Upload Photos | ✅ | ✅ | ✅ |
| Manage Users | ✅ | ✅ | ❌ |
| Delete Users | ✅ | ❌ | ❌ |
| Change User Roles | ✅ | ❌ | ❌ |
| View All Data | ✅ | ✅ | Own only |

## Background Jobs

The system runs the following scheduled tasks:

- **Daily at 2 AM** - Process sync queue
- **Weekly on Sunday at 8 AM** - Generate weekly reports
- **Monthly on 1st at 3 AM** - Monthly backup
- **Daily at 4 AM** - Cleanup old logs

## Security Features

- JWT authentication with refresh tokens
- Password hashing with bcrypt
- Rate limiting on auth endpoints
- Helmet.js for security headers
- CORS configuration
- Input validation
- SQL injection prevention (parameterized queries)

## License

GPL-3.0 License

## Author

**sabujdotnet**
- Website: https://sabujdotnet.github.io
- GitHub: https://github.com/sabujdotnet

---

<p align="center">
  Made with ❤️ for Bangladesh
</p>
