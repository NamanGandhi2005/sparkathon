// frontend/src/pages/LocalBusinessMarketplacePage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { SurplusCrate, OfferCreatePayload, LocalBusiness } from '../types/data';
import { fetchAvailableSurplusCrates, makeOfferOnCrate, fetchLocalBusinesses } from '../services/api';
import CrateCard from '../components/specific/CrateCard';
import StoresMapLeaflet from '../components/specific/StoresMapLeaflet';

const MOCK_LOGGED_IN_BUSINESS_ID = "YOUR_MOCK_BUSINESS_ID_FROM_STEP_1_TESTING"; // e.g., cafe_goodday_id

const LocalBusinessMarketplacePage: React.FC = () => {
    const [availableCrates, setAvailableCrates] = useState<SurplusCrate[]>([]);
    const [businessesForMap, setBusinessesForMap] = useState<LocalBusiness[]>([]); // To show other businesses
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [showOfferModal, setShowOfferModal] = useState(false);
    const [selectedCrateForOffer, setSelectedCrateForOffer] = useState<SurplusCrate | null>(null);
    const [offerAmount, setOfferAmount] = useState<string>('');
    const [isSubmittingOffer, setIsSubmittingOffer] = useState(false);
    const [offerError, setOfferError] = useState<string | null>(null);

    const loadMarketplaceData = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const [cratesRes, bizRes] = await Promise.all([
                fetchAvailableSurplusCrates(),
                fetchLocalBusinesses() // Fetch businesses to show on map
            ]);

            setAvailableCrates(cratesRes.data.filter(crate => crate.status === 'listed'));
            setBusinessesForMap(bizRes.data); // Set businesses for the map

        } catch (err: any) {
            setError(err.response?.data?.detail || err.message || 'Failed to load marketplace data');
            console.error("Marketplace load error:", err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadMarketplaceData();
    }, [loadMarketplaceData]);

    const handleOpenOfferModal = (crateId: string, currentPrice: number) => {
        const crate = availableCrates.find(c => c.crateId === crateId);
        if (crate) {
            setSelectedCrateForOffer(crate);
            setOfferAmount(currentPrice.toFixed(2));
            setOfferError(null);
            setShowOfferModal(true);
        }
    };

    // handleCloseOfferModal and handleSubmitOffer remain the same as your previous version...
    const handleCloseOfferModal = () => {
        setShowOfferModal(false);
        setSelectedCrateForOffer(null);
        setOfferAmount('');
        setOfferError(null);
    };

    const handleSubmitOffer = async () => {
        if (!selectedCrateForOffer || !MOCK_LOGGED_IN_BUSINESS_ID) {
            setOfferError("Cannot submit offer. Crate or Business ID missing.");
            return;
        }
        const price = parseFloat(offerAmount);
        if (isNaN(price) || price <= 0) {
            setOfferError("Please enter a valid positive offer amount.");
            return;
        }

        setIsSubmittingOffer(true);
        setOfferError(null);

        const payload: OfferCreatePayload = {
            businessId: MOCK_LOGGED_IN_BUSINESS_ID,
            offerPrice: price,
        };

        try {
            await makeOfferOnCrate(selectedCrateForOffer.crateId, payload);
            alert('Offer submitted successfully!');
            handleCloseOfferModal();
            loadMarketplaceData(); 
        } catch (err: any) {
            setOfferError(err.response?.data?.detail || err.message || "Failed to submit offer.");
        } finally {
            setIsSubmittingOffer(false);
        }
    };
    // End of offer modal functions

    // Function to handle click from map marker popup
    const handleMapCrateClick = (crateId: string) => {
        const crate = availableCrates.find(c => c.crateId === crateId);
        if (crate) {
            handleOpenOfferModal(crate.crateId, crate.listingPrice);
        }
    };


    return (
        <div>
            <h1 className="text-3xl font-bold mb-6 text-gray-800">Local Business Marketplace</h1>
            {error && <p className="mb-4 text-center text-red-600 bg-red-100 p-3 rounded">{error}</p>}

            <div className="flex flex-col lg:flex-row gap-6">
                {/* Crates List */}
                <div className="lg:w-3/5 order-2 lg:order-1">
                    <h2 className="text-2xl font-semibold mb-4 text-gray-700">Available Surplus Crates</h2>
                    {isLoading ? (
                        <p className="text-gray-500 italic">Loading available crates...</p>
                    ) : availableCrates.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {availableCrates.map(crate => (
                                <CrateCard
                                    key={crate.crateId}
                                    crate={crate}
                                    onMakeOffer={handleOpenOfferModal}
                                    isRetailerView={false}
                                />
                            ))}
                        </div>
                    ) : (
                        <p className="text-gray-500 italic bg-white p-6 rounded-lg shadow text-center">No surplus crates currently available.</p>
                    )}
                </div>

                {/* Map Area */}
                <div className="lg:w-2/5 order-1 lg:order-2 bg-white p-1 rounded-lg shadow-lg" style={{ minHeight: '400px', height: '60vh' }}> {/* Added height */}
                    <h2 className="text-xl font-semibold mb-3 text-gray-700 p-3">Nearby Locations</h2>
                    <StoresMapLeaflet
                        // businesses={businessesForMap} // Pass fetched businesses
                        crates={availableCrates}      // Pass available crates
                        onCrateClick={handleMapCrateClick} // Handle clicks from map
                    />
                </div>
            </div>

            {/* Offer Modal (same as your previous version) */}
            {showOfferModal && selectedCrateForOffer && (
                <div className="fixed inset-0 bg-black bg-opacity-60 overflow-y-auto h-full w-full flex justify-center items-center z-50">
                    <div className="relative p-6 border w-full max-w-md shadow-xl rounded-md bg-white">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl leading-6 font-semibold text-gray-900">
                                Make Offer for Crate <span className="font-mono text-sm">{selectedCrateForOffer.crateId.substring(0,8)}...</span>
                            </h3>
                            <button onClick={handleCloseOfferModal} className="text-gray-400 hover:text-gray-600">
                                 <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <p className="text-sm text-gray-600">Items: {selectedCrateForOffer.items.map(i => i.name).join(', ')}</p>
                                <p className="text-sm text-gray-600">Listing Price: <span className="font-semibold">${selectedCrateForOffer.listingPrice.toFixed(2)}</span></p>
                            </div>
                            <div>
                                <label htmlFor="offerAmount" className="block text-sm font-medium text-gray-700">Your Offer Amount ($)</label>
                                <input
                                    type="number"
                                    id="offerAmount"
                                    value={offerAmount}
                                    onChange={(e) => setOfferAmount(e.target.value)}
                                    placeholder="e.g., 8.00"
                                    step="0.01"
                                    min="0.01"
                                    required
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                                />
                            </div>
                            {offerError && <p className="text-sm text-red-600">{offerError}</p>}
                            <div className="pt-3">
                                <button
                                    type="button"
                                    onClick={handleSubmitOffer}
                                    disabled={isSubmittingOffer}
                                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                                >
                                    {isSubmittingOffer ? 'Submitting Offer...' : 'Submit Offer'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LocalBusinessMarketplacePage;