# <div align="center">ChurnPredict AI - Customer Churn Prediction Application</div>

A comprehensive web application for predicting customer churn using machine learning, built with Next.js and designed for integration with Clerk authentication and Neon database.

### This project is presented to: Saal.AI in Abu Dhabi
![Saal.AI Logo](https://bizpages.org/uploaded_images/logo/30/34645.gif)

## Built with the tools and technologies:

![Flask](https://img.shields.io/badge/Flask-000000?style=for-the-badge&logo=flask&logoColor=white) ![JSON](https://img.shields.io/badge/JSON-000000?style=for-the-badge&logo=json&logoColor=white) ![Markdown](https://img.shields.io/badge/Markdown-000000?style=for-the-badge&logo=markdown&logoColor=white) ![npm](https://img.shields.io/badge/npm-CB3837?style=for-the-badge&logo=npm&logoColor=white) ![Autoprefixer](https://img.shields.io/badge/Autoprefixer-DD3A0A?style=for-the-badge&logo=autoprefixer&logoColor=white) ![PostCSS](https://img.shields.io/badge/PostCSS-DD3A0A?style=for-the-badge&logo=postcss&logoColor=white) ![scikit-learn](https://img.shields.io/badge/scikit--learn-F7931E?style=for-the-badge&logo=scikit-learn&logoColor=white) ![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black) ![Gunicorn](https://img.shields.io/badge/Gunicorn-499848?style=for-the-badge&logo=gunicorn&logoColor=white) ![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB) ![NumPy](https://img.shields.io/badge/NumPy-013243?style=for-the-badge&logo=numpy&logoColor=white) ![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white) ![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white) ![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white) ![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white) ![ESLint](https://img.shields.io/badge/ESLint-4B32C3?style=for-the-badge&logo=eslint&logoColor=white) ![pandas](https://img.shields.io/badge/pandas-150458?style=for-the-badge&logo=pandas&logoColor=white) ![datefns](https://img.shields.io/badge/date--fns-770C56?style=for-the-badge&logo=date-fns&logoColor=white) ![YAML](https://img.shields.io/badge/YAML-CB171E?style=for-the-badge&logo=yaml&logoColor=white)

## Dataset used: Telco Customer Churn – ([Kaggle](https://www.kaggle.com/blastchar/telco-customer-churn))

## Features

- **User Authentication**: Ready for Clerk integration with sign-in/sign-up pages
- **Churn Prediction**: ML-powered customer churn prediction with confidence scores
- **Session Management**: Store and track prediction history
- **Analytics Dashboard**: View prediction statistics and trends
- **Flask API Integration**: Backend API for ML model serving
- **Database Ready**: PostgreSQL schema for Neon.tech integration

![Dashboard view](https://i.ibb.co/SXDJVjCr/ss1.png)

## Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS, Shadcn/ui components, Radix UI
- **Backend**: Flask API (Python)
- **Database**: Neon.tech (Postgres) + Prisma Object Relational Mapper
- **Authentication**: Clerk (Authentication ready)
- **Icons**: Lucide React

```typescript
// call Flask API endpoint for prediction
    const flaskResponse = await fetch(`${process.env.FLASK_BASE_URL}/predict`, {
      method: "POST", // post request
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ customerData }), // send in the customerData back to the app.py
    })

    if (!flaskResponse.ok) {
      // check if flask response was faulty
      const errorData = await flaskResponse.json()
      throw new Error(errorData.error || "Flask API error")
    }

    const predictionResult = await flaskResponse.json() // jsonify the response result
```

## Project Structure (Change this)

```
churn-prediction-app/
├── app/
│
├── auth/
│   │   ├── signin/page.tsx
│   │   └── signup/page.tsx
│   ├── dashboard/page.tsx
│   ├── predict/page.tsx
│   ├── sessions/page.tsx
│   ├── api/predict/route.ts
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── components/ui/
│   └── [shadcn components]
├── lib/db/
│       └── utils.ts
└── [config files]
```

## Getting Started

### 1. Install Dependencies

```bash
npm install
```


### 2. Database Setup

Execute the database schema:

``` Prisma ORM
-- npx prisma generate
-- npx prisma db push
```

### 3. Environment Variables

Create a `.env` file:

```env
# Database (Neon)
DATABASE_URL=your_neon_database_url

# Clerk Authentication (when ready)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key

# Flask API
FLASK_BASE_URL=your_flask_url
```

### 4. Run the Application

Start the Next.js development server:

```bash
npm run dev
```

Start the Flask API (in a separate terminal):

```bash
python3 app.py
```

## Customer Data Parameters

The application handles 19 input parameters for churn prediction:

### Demographics
- Gender (Male/Female)
- Senior Citizen (Yes/No)
- Partner (Yes/No)
- Dependents (Yes/No)

### Account Information
- Tenure (months)
- Contract (Month-to-month, One year, Two year)
- Paperless Billing (Yes/No)
- Payment Method (Electronic check, Mailed check, Bank transfer, Credit card)

### Services
- Phone Service (Yes/No)
- Multiple Lines (Yes/No/No phone service)
- Internet Service (DSL/Fiber optic/No)
- Online Security (Yes/No/No internet service)
- Online Backup (Yes/No/No internet service)
- Device Protection (Yes/No/No internet service)
- Tech Support (Yes/No/No internet service)
- Streaming TV (Yes/No/No internet service)
- Streaming Movies (Yes/No/No internet service)

### Billing
- Monthly Charges ($)
- Total Charges ($)

## Integration Roadmap

### Clerk Authentication
1. Install Clerk packages
2. Configure Clerk providers
3. Add envirnoment variable keys

### Neon Database
1. Set up Neon project
2. Configure database connection

### ML Model Integration
1. Train your churn prediction model
2. Save model artifacts (pickle/joblib)
3. Update Flask API with real model
4. Implement feature preprocessing

## API Endpoints

### Next.js API Routes
- `POST /api/predict` - Proxy to Flask API for predictions

### Flask API Endpoints
- `POST /api/predict` - Generate churn prediction
- `GET /api/health` - Health check

## Database Schema

The application includes a complete PostgreSQL schema with:
- Users table (Clerk integration ready)
- Customer data storage
- Prediction sessions tracking

## Deployment

### Vercel Deployment
1. Push to GitHub
2. Connect to Vercel
3. Configure environment variables
4. Deploy

### Flask API Deployment
- The API Server was deployed on [Render](https://render.com/)


