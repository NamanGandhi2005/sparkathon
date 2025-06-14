// frontend/src/components/specific/OfferListItem.tsx
import React from 'react';
import { Offer } from '../../types/data';
interface OfferListItemProps {
    offer: Offer;
    onAccept: (offerId: string) => void;
    onReject: (offerId: string) => void;
    isProcessing: boolean; // To disable buttons during API call
}

const OfferListItem: React.FC<OfferListItemProps> = ({ offer, onAccept, onReject, isProcessing }) => {
    return (
        <div className="p-3 border-b border-gray-200 text-sm">
            <p>
                <span className="font-semibold">Offer ID:</span> {offer.offerId.substring(0, 8)}...
            </p>
            <p>
                <span className="font-semibold">Business ID:</span> {offer.businessId.substring(0, 8)}...
            </p>
            <p>
                <span className="font-semibold">Price:</span> ${offer.offerPrice.toFixed(2)}
            </p>
            <p>
                <span className="font-semibold">Status:</span>
                <span className={`ml-1 font-medium ${
                    offer.status === 'accepted' ? 'text-green-600' :
                    offer.status === 'rejected' ? 'text-red-600' : 'text-yellow-600'
                }`}>
                    {offer.status.charAt(0).toUpperCase() + offer.status.slice(1)}
                </span>
            </p>
            <p className="text-xs text-gray-500">
                Offered At: {new Date(offer.offeredAt).toLocaleString()}
            </p>
            {offer.status === 'pending' && (
                <div className="mt-2 space-x-2">
                    <button
                        onClick={() => onAccept(offer.offerId)}
                        disabled={isProcessing}
                        className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-xs font-medium disabled:opacity-50"
                    >
                        Accept
                    </button>
                    <button
                        onClick={() => onReject(offer.offerId)}
                        disabled={isProcessing}
                        className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-xs font-medium disabled:opacity-50"
                    >
                        Reject
                    </button>
                </div>
            )}
        </div>
    );
};

export default OfferListItem;