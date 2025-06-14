// frontend/src/components/specific/CrateCard.tsx
import React from 'react';
import { SurplusCrate } from '../../types/data';
import Button from '../common/Button'; // Using your common Button

interface CrateCardProps {
    crate: SurplusCrate;
    onMakeOffer?: (crateId: string, currentPrice: number) => void;
    onViewOffers?: (crateId: string) => void;
    isRetailerView?: boolean;
}

const CrateCard: React.FC<CrateCardProps> = ({ crate, onMakeOffer, onViewOffers, isRetailerView }) => {
    const itemsSummary = crate.items.map(item => `${item.name} (Qty: ${item.quantity})`).join(', ');

    const getStatusStyles = () => {
        switch (crate.status) {
            case 'sold': return 'text-green-700 bg-green-100 border-green-300';
            case 'offerReceived': return 'text-blue-700 bg-blue-100 border-blue-300';
            case 'listed': return 'text-yellow-700 bg-yellow-100 border-yellow-400';
            case 'expired':
            case 'donated':
                return 'text-gray-600 bg-gray-100 border-gray-300';
            default: return 'text-gray-700 bg-gray-100 border-gray-300';
        }
    };

    return (
        <div className="border border-gray-200 p-4 rounded-lg shadow-md mb-4 bg-white hover:shadow-lg transition-shadow duration-300 flex flex-col justify-between">
            <div>
                <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-semibold text-green-700">
                        Crate: <span className="font-mono text-sm text-gray-600">{crate.crateId.substring(0, 8)}...</span>
                    </h3>
                    <span className={`px-2 py-0.5 text-xs font-semibold rounded-full border ${getStatusStyles()}`}>
                        {crate.status.charAt(0).toUpperCase() + crate.status.slice(1)}
                    </span>
                </div>

                <div className="text-xs text-gray-500 mb-2 space-y-0.5">
                    <p><strong>Listed:</strong> {new Date(crate.listedAt).toLocaleString()}</p>
                    <p><strong>Pickup:</strong> {crate.pickupWindow}</p>
                    {isRetailerView && crate.status === 'sold' && (
                        <p><strong>Sold Price:</strong> <span className="font-semibold text-green-600">${crate.finalPrice?.toFixed(2)}</span></p>
                    )}
                </div>

                <div className="mb-3">
                    <p className="font-medium text-sm text-gray-800">Contents:</p>
                    <p className="text-xs text-gray-700 break-words h-10 overflow-hidden relative group">
                        {itemsSummary}
                        {itemsSummary.length > 70 && ( // Simple check for truncation
                           <span className="absolute bottom-0 right-0 bg-gradient-to-l from-white via-white to-transparent pr-1">...</span>
                        )}
                         {/* Tooltip for full items on hover - can be complex, basic here */}
                        <span className="absolute hidden group-hover:block bg-black text-white text-xs rounded py-1 px-2 -top-8 left-0 z-10 w-auto min-w-max max-w-xs">
                            {itemsSummary}
                        </span>
                    </p>
                </div>
                {!isRetailerView && (
                     <p className="text-xl font-bold text-green-600 mb-3">Price: ${crate.listingPrice.toFixed(2)}</p>
                )}
            </div>

            <div className="mt-auto pt-3 border-t border-gray-200">
                {isRetailerView && crate.status === 'offerReceived' && onViewOffers && (
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => onViewOffers(crate.crateId)}
                        className="w-full"
                    >
                        View Offers
                    </Button>
                )}

                {!isRetailerView && crate.status === 'listed' && onMakeOffer && (
                    <Button
                        variant="primary"
                        size="sm"
                        onClick={() => onMakeOffer(crate.crateId, crate.listingPrice)}
                        className="w-full"
                    >
                        Make Offer
                    </Button>
                )}
                {!isRetailerView && crate.status !== 'listed' && (
                    <p className="text-xs text-center font-medium text-red-500 p-1 bg-red-50 rounded">
                        Not available for offers
                    </p>
                )}
            </div>
        </div>
    );
};

export default CrateCard;