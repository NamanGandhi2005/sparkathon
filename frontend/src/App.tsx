// frontend/src/App.tsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/layout/Navbar';
import RetailerDashboardPage from './pages/RetailerDashboardPage';
import CreateCratePage from './pages/CreateCratePage';
import LocalBusinessMarketplacePage from './pages/LocalBusinessMarketplacePage';
import NotFoundPage from './pages/NotFoundPage';
import './index.css'; // Ensure Tailwind is imported (usually here or in index.tsx)
import 'leaflet/dist/leaflet.css'; // Import Leaflet CSS
function App() {
   return (
     <Router>
       <div className="flex flex-col min-h-screen bg-gray-100">
         <Navbar />
         <main className="flex-grow container mx-auto p-4 md:p-6 lg:p-8">
           <Routes>
             <Route path="/" element={<RetailerDashboardPage />} /> {/* Default route */}
             <Route path="/retailer" element={<RetailerDashboardPage />} />
             <Route path="/retailer/create-crate" element={<CreateCratePage />} />
             <Route path="/marketplace" element={<LocalBusinessMarketplacePage />} />
             <Route path="*" element={<NotFoundPage />} />
           </Routes>
         </main>
         <footer className="bg-gray-800 text-white text-center p-4 text-sm">
            © {new Date().getFullYear()} WasteNot AI - Sparkathon Project
         </footer>
       </div>
     </Router>
   );
 }

 export default App;