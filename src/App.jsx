import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { BookingProvider } from './context/BookingContext';
import DashboardPage from './pages/DashboardPage';
import BookingPage from './pages/BookingPage';
import SearchPage from './pages/SearchPage';
import MapView from './pages/MapView';

function App() {
  return (
    <BookingProvider>
      <Router>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/book" element={<BookingPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/map" element={<MapView />} />
        </Routes>
      </Router>
    </BookingProvider>
  );
}

export default App;
