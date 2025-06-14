// frontend/src/components/specific/InventoryListItem.tsx
import React from 'react';
import { InventoryItem } from '../../types/data';
interface InventoryListItemProps {
   item: InventoryItem;
 }

 const InventoryListItem: React.FC<InventoryListItemProps> = ({ item }) => {
   const getStatusColor = () => {
     switch (item.status) {
       case 'atRisk': return 'text-red-600 border-red-300 bg-red-50';
       case 'nearingExpiry': return 'text-yellow-700 border-yellow-400 bg-yellow-50';
       case 'expired': return 'text-gray-500 border-gray-300 bg-gray-100 line-through';
       default: return 'text-green-700 border-green-300 bg-green-50';
     }
   };

   return (
     <li className={`p-3 border-b border-gray-200 flex justify-between items-center ${getStatusColor().split(' ')[2]}`}> {/* bg color */}
       <div>
         <span className="font-semibold text-gray-800">{item.productName}</span>
         <span className="text-xs text-gray-500 ml-1">(ID: {item.productId})</span>
         <p className="text-sm text-gray-600">
           Qty: {item.quantity} {item.unit} • Expires: {new Date(item.expiryDate).toLocaleDateString()}
         </p>
       </div>
       <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor()}`}>
         {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
       </span>
     </li>
   );
 };

 export default InventoryListItem;