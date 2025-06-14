// frontend/src/components/layout/Navbar.tsx
import React from 'react';
import { Link } from 'react-router-dom';
const Navbar: React.FC = () => {
   return (
     <nav className="bg-green-700 p-4 text-white shadow-md">
       <div className="container mx-auto flex justify-between items-center">
         <Link to="/" className="font-bold text-2xl hover:text-green-300 transition-colors">
           WasteNot AI
         </Link>
         <div className="space-x-6">
           <Link to="/retailer" className="hover:text-green-300 transition-colors pb-1 border-b-2 border-transparent hover:border-green-300">
             Retailer Dashboard
           </Link>
           <Link to="/marketplace" className="hover:text-green-300 transition-colors pb-1 border-b-2 border-transparent hover:border-green-300">
             Local Marketplace
           </Link>
           {/* Add other links like Login/Logout later if needed */}
         </div>
       </div>
     </nav>
   );
 };

 export default Navbar;