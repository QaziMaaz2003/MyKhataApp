# MyKhataApp Frontend

A modern React-based frontend application for managing Khata transactions and records efficiently.

## 📋 Table of Contents

- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Installation](#installation)
- [Available Scripts](#available-scripts)
- [Technologies](#technologies)
- [Contributing](#contributing)

## 🚀 Getting Started

### Prerequisites

- Node.js 14 or higher
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/QaziMaaz2003/MyKhataApp.git
cd MyKhataApp
```

2. Install dependencies:
```bash
npm install
```

3. Create environment file:
```bash
cp .env.example .env
```

4. Start the development server:
```bash
npm start
```

Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

## 📁 Project Structure

```
src/
├── components/          # Reusable React components
├── pages/              # Page-level components
├── hooks/              # Custom React hooks
├── utils/              # Utility functions
├── styles/             # CSS styling
├── App.js              # Main App component
├── index.js            # Entry point
└── index.css           # Global styles

public/
├── index.html          # Main HTML file
├── manifest.json       # PWA manifest
└── favicon.ico         # Website icon
```

## 📦 Available Scripts

### `npm start`
Runs the app in development mode at [http://localhost:3000](http://localhost:3000)

### `npm run build`
Builds the app for production to the `build` folder

### `npm test`
Launches the test runner in interactive watch mode

## 🛠️ Technologies Used

- **React** `^18.2.0` - UI library
- **React Router DOM** `^6.9.0` - Routing
- **Axios** `^1.3.0` - HTTP client
- **React Scripts** `5.0.1` - Build tooling

## 🔧 Environment Variables

Create a `.env` file:

```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_ENV=development
```

## 🤝 Contributing

1. Create a feature branch (`git checkout -b feature/AmazingFeature`)
2. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
3. Push to the branch (`git push origin feature/AmazingFeature`)
4. Open a Pull Request

## 📄 License

MIT License

## 👤 Author

**QaziMaaz2003** - [GitHub](https://github.com/QaziMaaz2003)
