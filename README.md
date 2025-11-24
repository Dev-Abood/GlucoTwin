# <div align="center">GlucoTwin – Gestational Diabetes Monitoring Platform</div>

A comprehensive digital health application for monitoring and predicting gestational diabetes mellitus (GDM) using machine learning, built with Next.js and Flask, designed for integration with Clerk authentication and Neon database.

### Senior Graduation Project – University of Sharjah  
**Contributors:**  
- Abdulla Sayed – U22103623  
- Abdulrahman Mahdi – U2200186  
- Ashraf Bin Adam – U22104510  
- Omar Farouq – U22100742  

![University Logo Placeholder](insert-your-university-logo.png)

---

## Built with the tools and technologies:

![Flask](https://img.shields.io/badge/Flask-000000?style=for-the-badge&logo=flask&logoColor=white) ![JSON](https://img.shields.io/badge/JSON-000000?style=for-the-badge&logo=json&logoColor=white) ![Markdown](https://img.shields.io/badge/Markdown-000000?style=for-the-badge&logo=markdown&logoColor=white) ![npm](https://img.shields.io/badge/npm-CB3837?style=for-the-badge&logo=npm&logoColor=white) ![scikit-learn](https://img.shields.io/badge/scikit--learn-F7931E?style=for-the-badge&logo=scikit-learn&logoColor=white) ![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black) ![Gunicorn](https://img.shields.io/badge/Gunicorn-499848?style=for-the-badge&logo=gunicorn&logoColor=white) ![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB) ![NumPy](https://img.shields.io/badge/NumPy-013243?style=for-the-badge&logo=numpy&logoColor=white) ![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white) ![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white) ![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white) ![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white) ![pandas](https://img.shields.io/badge/pandas-150458?style=for-the-badge&logo=pandas&logoColor=white) ![datefns](https://img.shields.io/badge/date--fns-770C56?style=for-the-badge&logo=date-fns&logoColor=white) ![YAML](https://img.shields.io/badge/YAML-CB171E?style=for-the-badge&logo=yaml&logoColor=white)

---

## Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript  
- **Styling**: Tailwind CSS, Shadcn/ui components, Radix UI  
- **Backend**: Flask API (Python, scikit-learn, pandas, NumPy)  
- **Database**: Neon.tech (Postgres) + Prisma ORM  
- **Authentication**: Clerk  
- **Icons**: Lucide React  
- **Deployment**:  
  - Next.js app on Vercel (`gluco-twin.vercel.app`)  
  - Flask API on Render (Dockerized)  

```typescript
// call Flask API endpoint for prediction
const flaskResponse = await fetch(`${process.env.FLASK_BASE_URL}/predict`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ patientData }),
})
const predictionResult = await flaskResponse.json()
```

## Project Structure

```
GlucoTwin/
├── app/
│   ├── (auth)/
│   │   ├── sign-in/
│   │   └── sign-up/
│   ├── doctor/
│   │   ├── dashboard/
│   │   ├── messages/
│   │   ├── patients/
│   │   └── profile/
│   ├── onboarding/
│   ├── patient/
│   │   ├── _components/
│   │   ├── dashboard/
│   │   ├── messages/
│   │   ├── profile/
│   │   ├── readings/
│   │   │   ├── edit/
│   │   │   └── new/
│   │   └── utils/
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
├── hooks/
├── lib/
├── prisma/
├── public/
├── python-scripts/
├── styles/
├── app.py
├── components.json
├── Dockerfile
└── middleware.ts
```
