// frontend/src/pages/NotFoundPage.tsx
import React from 'react';
import { Link } from 'react-router-dom';
const NotFoundPage: React.FC = () => {
   return (
     <div className="text-center py-10">
       <h1 className="text-6xl font-bold text-red-500">404</h1>
       <p className="text-2xl mt-4 mb-2 text-gray-700">Page Not Found</p>
       <p className="text-gray-500 mb-6">
         Sorry, the page you are looking for does not exist.
       </p>
       <Link
         to="/"
         className="bg-green-500 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
       >
         Go to Homepage
       </Link>
     </div>
   );
 };

 export default NotFoundPage;