import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { InventoryItem, SurplusCrate, Offer, Product, InventoryItemCreatePayload } from '../types/data';
import {
    fetchAtRiskInventory,
    fetchStoreSurplusCrates,
    fetchOffersForCrate,
    respondToOffer,
    fetchProducts,
    addInventoryItem
} from '../services/api';
import InventoryListItem from '../components/specific/InventoryListItem';
import CrateCard from '../components/specific/CrateCard';
import OfferListItem from '../components/specific/OfferListItem';
import Button from '../components/common/Button';
import { AxiosResponse } from 'axios';

const MOCK_STORE_ID = "walmart_001";

// Interface for the Add Inventory Form's UI state
interface NewInventoryFormUIState {
    productId: string;
    quantity: string; // Input values are typically strings
    purchaseDate: string;
    unit: string;
}

const RetailerDashboardPage: React.FC = () => {
    const [atRiskInventory, setAtRiskInventory] = useState<InventoryItem[]>([]);
    const [storeCrates, setStoreCrates] = useState<SurplusCrate[]>([]);
    const [selectedCrateOffers, setSelectedCrateOffers] = useState<Offer[]>([]);
    const [viewingOffersForCrateId, setViewingOffersForCrateId] = useState<string | null>(null);

    const [isLoadingPageData, setIsLoadingPageData] = useState(false);
    const [pageError, setPageError] = useState<string | null>(null);

    const [isLoadingOffers, setIsLoadingOffers] = useState(false);
    const [offerModalError, setOfferModalError] = useState<string | null>(null);
    const [isProcessingOfferResponse, setIsProcessingOfferResponse] = useState(false);

    const [showAddInventoryModal, setShowAddInventoryModal] = useState(false);
    const [productsForDropdown, setProductsForDropdown] = useState<Product[]>([]);
    const [newInventoryForm, setNewInventoryForm] = useState<NewInventoryFormUIState>({
        productId: '',
        quantity: '1', // Default to '1' as a string for the input
        purchaseDate: new Date().toISOString().split('T')[0],
        unit: '',
    });
    const [isAddingInventory, setIsAddingInventory] = useState(false);
    const [addInventoryError, setAddInventoryError] = useState<string | null>(null);

    const loadPageData = useCallback(async (fetchProductList = false) => {
        setIsLoadingPageData(true);
        setPageError(null);
        try {
            const inventoryPromise: Promise<AxiosResponse<InventoryItem[]>> = fetchAtRiskInventory(MOCK_STORE_ID);
            const cratesPromise: Promise<AxiosResponse<SurplusCrate[]>> = fetchStoreSurplusCrates(MOCK_STORE_ID);

            if (fetchProductList || productsForDropdown.length === 0) {
                const productsPromise: Promise<AxiosResponse<Product[]>> = fetchProducts();
                const [inventoryRes, cratesRes, productsRes] = await Promise.all([
                    inventoryPromise,
                    cratesPromise,
                    productsPromise
                ]);
                setAtRiskInventory(inventoryRes.data);
                setStoreCrates(cratesRes.data);
                const fetchedProducts = productsRes.data;
                setProductsForDropdown(fetchedProducts);
                // Set initial form values if products are fetched for the first time
                if (fetchedProducts.length > 0 && newInventoryForm.productId === '') {
                    setNewInventoryForm(prev => ({
                        ...prev,
                        productId: fetchedProducts[0].productId,
                        unit: fetchedProducts[0].unit,
                        quantity: '1' // Ensure quantity is also set/reset here
                    }));
                }
            } else {
                const [inventoryRes, cratesRes] = await Promise.all([
                    inventoryPromise,
                    cratesPromise
                ]);
                setAtRiskInventory(inventoryRes.data);
                setStoreCrates(cratesRes.data);
            }
        } catch (err: any) {
            setPageError(err.response?.data?.detail || err.message || 'Failed to load dashboard data');
            console.error("Load page data error:", err);
        } finally {
            setIsLoadingPageData(false);
        }
    }, [productsForDropdown.length, newInventoryForm.productId]); // Dependency array

    useEffect(() => {
        loadPageData(true); // Fetch products on initial load
    }, [loadPageData]);

    const handleViewOffers = async (crateId: string) => {
        console.log("Opening offers for crateId:", crateId);
        setViewingOffersForCrateId(crateId);
        setSelectedCrateOffers([]);
        setIsLoadingOffers(true);
        setOfferModalError(null);
        try {
            console.log("Fetching offers...");
            const offersRes = await fetchOffersForCrate(crateId);
            console.log("Offers fetched:", offersRes.data);
            setSelectedCrateOffers(offersRes.data);
        } catch (err: any) {
            console.error("Fetch offers error in handleViewOffers:", err);
            setOfferModalError(`Failed to load offers: ${err.response?.data?.detail || err.message}`);
        } finally {
            console.log("Finished loading offers, isLoadingOffers set to false.");
            setIsLoadingOffers(false);
        }
    };

    const handleRespondToOffer = async (crateId: string, offerId: string, status: "accepted" | "rejected") => {
        setIsProcessingOfferResponse(true);
        setOfferModalError(null);
        try {
            await respondToOffer(crateId, offerId, status);
            alert(`Offer ${status} successfully!`);
            setViewingOffersForCrateId(null);
            setSelectedCrateOffers([]);
            loadPageData();
        } catch (err: any) {
            console.error("Respond to offer error:", err);
            setOfferModalError(`Failed to respond to offer: ${err.response?.data?.detail || err.message}`);
        } finally {
            setIsProcessingOfferResponse(false);
        }
    };

    const handleAddInventoryChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setNewInventoryForm(prev => {
            const newState = { ...prev, [name]: value };
            if (name === 'productId') {
                const selectedProduct = productsForDropdown.find(p => p.productId === value);
                newState.unit = selectedProduct ? selectedProduct.unit : '';
            }
            return newState;
        });
    };

    const handleAddInventorySubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const quantityNum = parseInt(newInventoryForm.quantity, 10);

        if (!newInventoryForm.productId || isNaN(quantityNum) || quantityNum <= 0 || !newInventoryForm.purchaseDate || !newInventoryForm.unit) {
            setAddInventoryError("All fields are required, quantity must be a valid positive number, and product/unit must be selected.");
            return;
        }
        setIsAddingInventory(true);
        setAddInventoryError(null);
        try {
            const payload: InventoryItemCreatePayload = {
                productId: newInventoryForm.productId,
                quantity: quantityNum,
                purchaseDate: newInventoryForm.purchaseDate,
                unit: newInventoryForm.unit,
                storeId: MOCK_STORE_ID,
            };
            await addInventoryItem(payload);
            alert('Inventory item added successfully!');
            setShowAddInventoryModal(false);
            const firstProduct = productsForDropdown.length > 0 ? productsForDropdown[0] : null;
            setNewInventoryForm({
                productId: firstProduct ? firstProduct.productId : '',
                quantity: '1', // Reset quantity as string for form
                purchaseDate: new Date().toISOString().split('T')[0],
                unit: firstProduct ? firstProduct.unit : ''
            });
            loadPageData();
        } catch (err: any) {
            setAddInventoryError(err.response?.data?.detail || err.message || "Failed to add inventory item.");
            console.error("Add inventory error:", err);
        } finally {
            setIsAddingInventory(false);
        }
    };

    if (isLoadingPageData && !viewingOffersForCrateId && !showAddInventoryModal) return <p className="text-center text-gray-500 py-10">Loading retailer dashboard...</p>;
    if (pageError && !viewingOffersForCrateId && !showAddInventoryModal) return <p className="text-center text-red-500 py-10">Error: {pageError}. <button onClick={() => loadPageData(true)} className="text-blue-500 underline">Try again</button></p>;

    return (
        <div>
            <h1 className="text-3xl font-bold mb-6 text-gray-800">Retailer Dashboard ({MOCK_STORE_ID})</h1>
            {pageError && !viewingOffersForCrateId && !showAddInventoryModal && <p className="text-center text-red-500 p-2 bg-red-100 rounded mb-4">{pageError}</p>}

            <div className="mb-6">
                <Button
                    onClick={() => {
                        setAddInventoryError(null);
                        const firstProduct = productsForDropdown.length > 0 ? productsForDropdown[0] : null;
                        setNewInventoryForm({ // Explicitly set all fields of NewInventoryFormUIState
                            productId: firstProduct ? firstProduct.productId : (newInventoryForm.productId || ''), // Keep current if no products
                            quantity: '1',
                            purchaseDate: new Date().toISOString().split('T')[0],
                            unit: firstProduct ? firstProduct.unit : (newInventoryForm.unit || ''),
                        });
                        setShowAddInventoryModal(true);
                    }}
                    variant="secondary"
                >
                    + Add New Stock Item
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-8">
                <section className="bg-white p-6 rounded-lg shadow-lg">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-2xl font-semibold text-gray-700">At-Risk Inventory</h2>
                        <Link
                            to="/retailer/create-crate"
                            state={{ atRiskItems: atRiskInventory.filter(item => item.status !== 'expired') }}
                            className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded text-sm transition-colors"
                        >
                            + Create Crate
                        </Link>
                    </div>
                    {isLoadingPageData ? <p className="text-gray-500 italic">Loading inventory...</p> : atRiskInventory.length > 0 ? (
                        <ul className="max-h-96 overflow-y-auto divide-y divide-gray-200">
                            {atRiskInventory.map(item => <InventoryListItem key={item.inventoryItemId} item={item} />)}
                        </ul>
                    ) : (
                        <p className="text-gray-500 italic">No at-risk items found.</p>
                    )}
                </section>

                <section className="bg-white p-6 rounded-lg shadow-lg">
                    <h2 className="text-2xl font-semibold text-gray-700 mb-4">My Surplus Crates</h2>
                    {isLoadingPageData ? <p className="text-gray-500 italic">Loading crates...</p> : storeCrates.length > 0 ? (
                        <div className="max-h-96 overflow-y-auto space-y-4 pr-2">
                            {storeCrates.map(crate => (
                                <CrateCard key={crate.crateId} crate={crate} onViewOffers={handleViewOffers} isRetailerView={true} />
                            ))}
                        </div>
                    ) : (
                        <p className="text-gray-500 italic">No surplus crates listed yet.</p>
                    )}
                </section>
            </div>

            {viewingOffersForCrateId && (
                <div className="fixed inset-0 bg-black bg-opacity-60 overflow-y-auto h-full w-full flex justify-center items-center z-[1000] transition-opacity duration-300">
                    <div className="relative p-6 border w-full max-w-lg shadow-xl rounded-md bg-white transform transition-all scale-100 opacity-100">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl leading-6 font-semibold text-gray-900">Offers for Crate <span className="font-mono text-sm">{viewingOffersForCrateId.substring(0,8)}...</span></h3>
                            <button onClick={() => { setViewingOffersForCrateId(null); setOfferModalError(null); }} className="text-gray-400 hover:text-gray-600">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                            </button>
                        </div>
                        <div className="max-h-80 overflow-y-auto divide-y divide-gray-200 pr-2">
                            {isLoadingOffers ? <p className="text-gray-500 italic py-4 text-center">Loading offers...</p>
                                : selectedCrateOffers.length > 0 ? selectedCrateOffers.map(offer => (
                                    <OfferListItem key={offer.offerId} offer={offer}
                                        onAccept={() => handleRespondToOffer(viewingOffersForCrateId!, offer.offerId, 'accepted')}
                                        onReject={() => handleRespondToOffer(viewingOffersForCrateId!, offer.offerId, 'rejected')}
                                        isProcessing={isProcessingOfferResponse} />
                                )) : <p className="text-gray-500 italic py-4 text-center">No offers found for this crate.</p>}
                        </div>
                        {offerModalError && <p className="text-red-500 text-xs mt-3 text-center">{offerModalError}</p>}
                    </div>
                </div>
            )}

             {showAddInventoryModal && (
                <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-[1000]">
                    <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-semibold">Add New Inventory Item</h3>
                            <button onClick={() => setShowAddInventoryModal(false)} className="text-gray-400 hover:text-gray-600">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                            </button>
                        </div>
                        {addInventoryError && <p className="text-red-500 text-sm mb-3 bg-red-50 p-2 rounded">{addInventoryError}</p>}
                        <form onSubmit={handleAddInventorySubmit} className="space-y-4">
                            <div>
                                <label htmlFor="productId" className="block text-sm font-medium text-gray-700">Product</label>
                                <select
                                    id="productId"
                                    name="productId"
                                    value={newInventoryForm.productId}
                                    onChange={handleAddInventoryChange}
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                                    required
                                >
                                    <option value="" disabled>Select a product</option>
                                    {productsForDropdown.map(p => (
                                        <option key={p.productId} value={p.productId}>{p.name} ({p.unit})</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="quantity" className="block text-sm font-medium text-gray-700">Quantity</label>
                                <input
                                    type="number"
                                    id="quantity"
                                    name="quantity"
                                    value={newInventoryForm.quantity}
                                    onChange={handleAddInventoryChange}
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                                    min="1"
                                    required
                                />
                            </div>
                            <div>
                                <label htmlFor="purchaseDate" className="block text-sm font-medium text-gray-700">Purchase Date</label>
                                <input
                                    type="date"
                                    id="purchaseDate"
                                    name="purchaseDate"
                                    value={newInventoryForm.purchaseDate}
                                    onChange={handleAddInventoryChange}
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                                    max={new Date().toISOString().split('T')[0]}
                                    required
                                />
                            </div>
                            <div className="flex justify-end space-x-3 pt-3">
                                <Button type="button" variant="outline" onClick={() => setShowAddInventoryModal(false)} disabled={isAddingInventory}>
                                    Cancel
                                </Button>
                                <Button type="submit" variant="primary" isLoading={isAddingInventory}>
                                    Add Item
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RetailerDashboardPage;