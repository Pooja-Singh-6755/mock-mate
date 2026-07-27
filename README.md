# MockMate 🧠

**AI-powered mock interview platform** — practice text, audio, video, and coding interviews with real-time AI-generated questions, scoring, and feedback. Built as a full-stack MERN project with adaptive difficulty, live analytics, and a system-design whiteboard.

---

## ✨ Features

- **Multiple interview modes** — Text, Audio, Video (with webcam + face tracking), Coding Sandbox, and MCQ
- **AI-generated questions & feedback** — every question, score, and piece of feedback comes from the Gemini API, based on candidate history (never hardcoded/static content)
- **Live code execution** — candidate code is run against real test cases via the Piston API
- **Resume-aware practice** — upload a resume; skills/experience are extracted (pdf-parse/mammoth + Gemini) and used to personalize questions
- **System design whiteboard** — drag-and-drop architecture diagramming with AI review of your design
- **Analytics dashboard** — score trends, topic-wise strength/weakness heatmap, streaks
- **Real-time notifications** — Socket.io-powered in-app alerts (report ready, streak milestones, reminders)
- **Auth** — email/password + OAuth (Google/GitHub), JWT-based sessions
- **Dark / light theme**, persisted per user

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React (Vite), React Router, Axios, Chart.js, Konva.js |
| Backend | Node.js, Express |
| Database | MongoDB (Mongoose) |
| Realtime | Socket.io |
| AI | Google Gemini API |
| Code execution | Piston API |
| Auth | JWT, bcrypt, OAuth (Google/GitHub) |
| File parsing | pdf-parse / mammoth (resume parsing) |
| Media | Web Speech API, face-api.js / MediaPipe |

---

## 📁 Project Structure

```
mockmate/
├── client/                        # React frontend
│   ├── public/
│   │   └── index.html
│   └── src/
│       ├── assets/                # images, icons, fonts, logo
│       ├── components/
│       │   ├── common/            # Button, Card, Modal, Toast, Loader, Badge
│       │   ├── layout/             # Sidebar, Topbar, Shell, NotifPanel, ProfileMenu
│       │   ├── interview/          # QuestionCard, Timer, AnswerBox, HintBox, FeedbackPanel
│       │   ├── video/              # VideoRoom, WebcamFeed, FaceTracker, ToneMeter
│       │   ├── coding/             # CodeEditor (Monaco), TestResultPanel, LanguageSelect
│       │   ├── resume/             # ResumeUpload, ResumeSummaryCard
│       │   └── dashboard/          # StatCard, ScoreChart, RadarChart, HeatmapChart
│       ├── pages/
│       │   ├── Auth/                # Login.jsx, Signup.jsx
│       │   ├── Setup.jsx
│       │   ├── TextInterview.jsx
│       │   ├── AudioInterview.jsx
│       │   ├── VideoInterview.jsx
│       │   ├── CodingSandbox.jsx
│       │   ├── Report.jsx
│       │   ├── History.jsx
│       │   ├── Analytics.jsx
│       │   ├── Tips.jsx
│       │   ├── Profile.jsx
│       │   ├── Settings.jsx
│       │   └── Help.jsx
│       ├── context/                 # AuthContext.jsx, ThemeContext.jsx
│       ├── hooks/                   # useAuth, useSocket, useSpeechRecognition, useFaceTracking
│       ├── services/                 # api.js + authService, interviewService, codingService, resumeService, analyticsService, notificationService
│       ├── utils/                    # formatDate.js, scoreColor.js, validators.js
│       ├── styles/                   # global.css, variables.css
│       ├── routes/AppRoutes.jsx
│       ├── App.jsx
│       └── main.jsx
│
├── server/                         # Node/Express backend
│   └── src/
│       ├── config/                  # db.js, gemini.js, piston.js, cloudinary.js, socket.js
│       ├── models/                  # User, Candidate, Resume, Interview, Question, Answer, CodingSubmission, Notification
│       ├── interfaces/              # IUser, IInterview, IQuestion, IAnswer, ICodingSubmission (TS-style contracts)
│       ├── controllers/             # authController, interviewController, questionController, codingController, resumeController, analyticsController, notificationController
│       ├── services/                 # geminiService, pistonService, resumeParserService, analyticsService, notificationService
│       ├── routes/                   # authRoutes, interviewRoutes, questionRoutes, codingRoutes, resumeRoutes, analyticsRoutes, notificationRoutes
│       ├── middleware/               # authMiddleware, errorHandler, uploadMiddleware, rateLimiter
│       ├── validators/               # authValidator, interviewValidator
│       ├── utils/                    # generateToken, asyncHandler, apiResponse
│       └── app.js
│   └── server.js                   # entry point
│
├── .gitignore
├── README.md
└── package.json
```

---

## 🗄 Database Schema (MongoDB / Mongoose)

| Model | Purpose |
|---|---|
| **User** | name, email, passwordHash, authProvider, avatarUrl, role |
| **Candidate** | userId, targetRole, experienceLevel, skills, resumeId, streak |
| **Resume** | userId, fileUrl, rawText, extractedSkills, extractedExperience |
| **Interview** | candidateId, type, role, difficultyLevel, status, overallScore, startedAt/endedAt |
| **Question** | interviewId, text, topic, difficulty, order, generatedBy: `"gemini"` |
| **Answer** | questionId, answerText, score, feedback, timeTakenSec |
| **CodingSubmission** | interviewId, problemStatement, language, code, testResults, passed |
| **Notification** | userId, type, message, read, createdAt |

> **Rule of thumb:** any content shown to the user (question text, feedback, score, coding problem, resume summary, chart data) comes from a `services/` call to Gemini, Piston, or a MongoDB aggregation — **never** a hardcoded array or fixture file.

---

## 🚀 Getting Started

### Prerequisites
- Node.js ≥ 18
- MongoDB Atlas cluster (or local MongoDB)
- A free [Gemini API key](https://ai.google.dev/)

### 1. Clone the repo
```bash
git clone https://gitlab.com/<your-username>/mockmate.git
cd mockmate
```

### 2. Backend setup
```bash
cd server
npm install
```

Create `server/.env`:
```env
MONGO_URI=your_mongodb_atlas_connection_string
JWT_SECRET=your_jwt_secret
GEMINI_API_KEY=your_gemini_api_key
PISTON_URL=https://emkc.org/api/v2/piston
PORT=5000
```

```bash
npm run dev
```

### 3. Frontend setup
```bash
cd ../client
npm install
```

Create `client/.env`:
```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

```bash
npm run dev
```

The app will be running at `http://localhost:5173` (frontend) and `http://localhost:5000` (backend).

---

## 📡 API Overview

| Route prefix | Handles |
|---|---|
| `/api/auth` | signup, login, OAuth, JWT refresh |
| `/api/interview` | start session, submit answer, get report |
| `/api/question` | AI question generation |
| `/api/coding` | fetch coding problem, run code via Piston |
| `/api/resume` | upload + parse resume |
| `/api/analytics` | dashboard aggregation stats |
| `/api/notification` | fetch, mark-read, realtime push |

---

## 🧪 Scripts

| Command | Location | Description |
|---|---|---|
| `npm run dev` | `server/` | Start backend with nodemon |
| `npm run dev` | `client/` | Start Vite dev server |
| `npm run build` | `client/` | Production build |

---

## 🤝 Contributing

This is currently a solo portfolio project, but suggestions and issues are welcome — feel free to open an issue or MR.

## 📄 License

MIT

## 👩‍💻 Author

**Pooja Singh**
Associate Software Developer · Angular & MERN Stack Developer
- GitHub: [github.com/Pooja-Singh-6755](https://github.com/Pooja-Singh-6755)
- LinkedIn: [linkedin.com/in/pooja-singh768a91284](https://linkedin.com/in/pooja-singh768a91284)
