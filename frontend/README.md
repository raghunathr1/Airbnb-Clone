# StayFinder – Airbnb Clone

StayFinder is a full-stack property rental and booking web application inspired by Airbnb. Users can explore properties, view property details, manage their wishlist, and make bookings through a responsive web interface.

The application is built using React, Node.js, Express.js, and MongoDB.

## Live Demo

- Live Website: https://airbnb-clone-alpha-seven.vercel.app/
- Backend API: https://airbnb-clone-2-yft3.onrender.com
- GitHub Repository: https://github.com/raghunathr1/Airbnb-Clone


## Features

- Browse available properties and accommodation listings.
- Search for properties and destinations.
- Filter properties by categories.
- View detailed property information.
- User authentication.
- Property booking functionality.
- View and manage bookings.
- Wishlist functionality.
- Property reviews and ratings.
- Responsive user interface.
- Map display functionality.
- RESTful API integration.
- MongoDB database integration.
- Separate frontend and backend applications.


## Tech Stack

### Frontend
- React.js
- Vite
- JavaScript
- HTML5
- CSS3
- Axios
- React Router
- React Icons

### Backend
- Node.js
- Express.js
- MongoDB
- Mongoose
- JWT Authentication
- CORS
- dotenv

### Deployment
- Frontend: Vercel
- Backend: Render
- Database: MongoDB Atlas
- Source Control: Git and GitHub


## Getting Started

Follow these steps to run the project locally.

### Prerequisites

Install the following tools before running the application:

- Node.js
- npm
- Git
- MongoDB Atlas account or a local MongoDB instance
- Code editor such as Visual Studio Code

### 1. Clone the Repository

git clone: https://github.com/raghunathr1/Airbnb-Clone.git

Navigate to the project directory:

cd Airbnb-Clone


### 2. Set Up the Backend

Open a terminal and run:

cd backend
npm install

Create a `.env` file inside the `backend` directory.

Add the following environment variables:


PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_secure_jwt_secret


Replace the placeholder values with your own MongoDB connection string and a strong, private JWT secret.

Start the backend server:
npm start


The backend should run at:

http://localhost:5000

Test the API health endpoint by opening:

http://localhost:5000/


### 3. Set Up the Frontend

Open another terminal and run:

cd frontend
npm install


Create a `.env` file inside the `frontend` directory.

VITE_API_URL=http://localhost:5000/api

npm run dev

Vite will display a local URL in the terminal, usually:

http://localhost:5173

Open that URL in your browser.

### 4. Run Both Applications

Keep both terminals running:

| Application | Local URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend | http://localhost:5000 |
| Backend health check | http://localhost:5000/ |
| Listings API | http://localhost:5000/api/listings |


## Deployment

### Frontend Deployment

The React frontend is deployed on Vercel.

Live URL:

https://airbnb-clone-alpha-seven.vercel.app/

Frontend deployment configuration:

- Framework Preset: Vite
- Root Directory: `frontend`
- Build Command: `npm run build`
- Output Directory: `dist`
- Environment Variable: `VITE_API_URL`

### Backend Deployment

The Express backend is deployed on Render.

Backend URL:

https://airbnb-clone-2-yft3.onrender.com

Configure the following environment variables in the Render dashboard:

```text
MONGO_URI
JWT_SECRET
```

Render provides the `PORT` value for the deployed service. The server uses `process.env.PORT` when available.

### Database

MongoDB Atlas is used to store application data. Configure the MongoDB connection string through the backend environment variables.

Do not commit the `.env` file or expose database credentials in the repository.
