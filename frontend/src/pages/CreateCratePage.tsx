// frontend/src/pages/CreateCratePage.tsx
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { InventoryItem, SurplusCrateItem, SurplusCrateCreatePayload } from '../types/data';
import { createSurplusCrate } from '../services/api';
import Button from '../components/common/Button'; // Assuming you have your Button component

const CreateCratePage: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();

    const [availableAtRiskItems, setAvailableAtRiskItems] = useState<InventoryItem[]>([]);
    // Use inventoryItemId as key and store the desired quantity as a string for the input
    const [itemQuantitiesInForm, setItemQuantitiesInForm] = useState<{ [inventoryItemId: string]: string }>({});
    const [selectedItemsForCrate, setSelectedItemsForCrate] = useState<SurplusCrateItem[]>([]);

    const [cratePrice, setCratePrice] = useState<string>('');
    const [pickupWindow, setPickupWindow] = useState<string>('Today 2 PM - 5 PM'); // Default
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);


    useEffect(() => {
        if (location.state && location.state.atRiskItems) {
            const initialItems = location.state.atRiskItems as InventoryItem[];
            setAvailableAtRiskItems(initialItems);
            // Initialize form quantities to empty strings
            const initialQtys: { [key: string]: string } = {};
            initialItems.forEach(item => {
                initialQtys[item.inventoryItemId] = ''; // Use specific inventoryItemId
            });
            setItemQuantitiesInForm(initialQtys);
        } else {
            navigate('/retailer', { replace: true, state: { error: "No at-risk items available to create a crate." } });
        }
    }, [location.state, navigate]);

    const handleItemQuantityChange = (inventoryItemId: string, value: string, maxAvailable: number) => {
        const numValue = parseInt(value, 10);
        if (value === '') { // Allow clearing the input
            setItemQuantitiesInForm(prev => ({ ...prev, [inventoryItemId]: '' }));
        } else if (!isNaN(numValue) && numValue >= 0 && numValue <= maxAvailable) {
            setItemQuantitiesInForm(prev => ({ ...prev, [inventoryItemId]: numValue.toString() }));
        } else if (!isNaN(numValue) && numValue > maxAvailable) {
            setItemQuantitiesInForm(prev => ({ ...prev, [inventoryItemId]: maxAvailable.toString() }));
            // Optionally, provide immediate feedback, though alert can be annoying
            // alert(`Cannot add more than available quantity (${maxAvailable}).`);
        }
        // Ignore non-numeric or negative inputs other than empty string
    };

    const handleAddItemToSelectedList = (inventoryItemFromAtRisk: InventoryItem) => {
        setError(null); // Clear previous errors
        const quantityStr = itemQuantitiesInForm[inventoryItemFromAtRisk.inventoryItemId];
        if (!quantityStr || quantityStr.trim() === '') {
            setError(`Please enter a quantity for ${inventoryItemFromAtRisk.productName}.`);
            return;
        }
        const quantityToAdd = parseInt(quantityStr, 10);

        if (isNaN(quantityToAdd) || quantityToAdd <= 0) {
            setError(`Please enter a valid positive quantity for ${inventoryItemFromAtRisk.productName}.`);
            return;
        }
        if (quantityToAdd > inventoryItemFromAtRisk.quantity) {
            setError(`Cannot add ${quantityToAdd} of ${inventoryItemFromAtRisk.productName}. Only ${inventoryItemFromAtRisk.quantity} available from this batch.`);
            setItemQuantitiesInForm(prev => ({ ...prev, [inventoryItemFromAtRisk.inventoryItemId]: inventoryItemFromAtRisk.quantity.toString() }));
            return;
        }

        setSelectedItemsForCrate(prevCrateItems => {
            const newCrateItems = [...prevCrateItems];
            const existingItemIndex = newCrateItems.findIndex(ci => ci.productId === inventoryItemFromAtRisk.productId);

            if (existingItemIndex > -1) {
                // Item with same productId exists, sum the quantities
                newCrateItems[existingItemIndex].quantity += quantityToAdd;
            } else {
                newCrateItems.push({
                    productId: inventoryItemFromAtRisk.productId,
                    name: inventoryItemFromAtRisk.productName,
                    quantity: quantityToAdd,
                });
            }
            return newCrateItems;
        });

        // Clear the input for the item just added
        setItemQuantitiesInForm(prev => ({ ...prev, [inventoryItemFromAtRisk.inventoryItemId]: '' }));
        setSuccessMessage(`${quantityToAdd} ${inventoryItemFromAtRisk.productName} added to crate.`);
        setTimeout(() => setSuccessMessage(null), 3000); // Clear success message after 3s
    };

    const handleRemoveItemFromSelectedList = (productIdToRemove: string) => {
        setSelectedItemsForCrate(prev => prev.filter(item => item.productId !== productIdToRemove));
        setSuccessMessage(null); // Clear any previous success message
    };

    const handleSubmitCrate = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccessMessage(null);

        if (selectedItemsForCrate.length === 0) {
            setError("Crate is empty. Please add items before submitting.");
            return;
        }
        const price = parseFloat(cratePrice);
        if (isNaN(price) || price <= 0) {
            setError("Please enter a valid positive price for the crate.");
            return;
        }
        if (!pickupWindow.trim()) {
            setError("Please specify a pickup window.");
            return;
        }

        // --- Final Client-Side Validation for Total Quantities ---
        // This sums up all quantities for a given product ID across potentially multiple at-risk batches
        for (const crateItem of selectedItemsForCrate) {
            let totalAvailableForThisProduct = 0;
            availableAtRiskItems.forEach(atRiskItem => {
                if (atRiskItem.productId === crateItem.productId) {
                    totalAvailableForThisProduct += atRiskItem.quantity;
                }
            });
            if (crateItem.quantity > totalAvailableForThisProduct) {
                setError(`Error: Quantity for ${crateItem.name} (${crateItem.quantity}) in crate exceeds total available stock (${totalAvailableForThisProduct}). Please adjust items in the crate.`);
                return;
            }
        }
        // --- End Final Validation ---

        setIsLoading(true);
        const payload: SurplusCrateCreatePayload = {
            storeId: "walmart_001", // Or from context
            items: selectedItemsForCrate,
            listingPrice: price,
            pickupWindow: pickupWindow,
        };

        try {
            await createSurplusCrate(payload);
            // On successful crate creation, we don't decrement inventory here.
            // That happens on the backend when the crate is *sold*.
            // The RetailerDashboard will refetch and show correct at-risk after navigation.
            alert('Surplus crate created successfully! Inventory will update upon sale.');
            navigate('/retailer');
        } catch (err: any) {
            setError(err.response?.data?.detail || err.message || 'Failed to create crate. The server might have rejected it due to inventory or other issues.');
            console.error("Create Crate Error:", err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto bg-white p-6 md:p-8 rounded-lg shadow-xl my-8">
            <Button variant="outline" size="sm" onClick={() => navigate(-1)} className="mb-6">
                ← Back to Dashboard
            </Button>
            <h1 className="text-2xl md:text-3xl font-bold mb-8 text-gray-800 text-center">Create New Surplus Crate</h1>

            {error && <p className="mb-4 text-center text-red-600 bg-red-100 p-3 rounded-md shadow">{error}</p>}
            {successMessage && <p className="mb-4 text-center text-green-600 bg-green-100 p-3 rounded-md shadow">{successMessage}</p>}

            <form onSubmit={handleSubmitCrate} className="space-y-10">
                <section>
                    <h2 className="text-xl font-semibold mb-4 text-gray-700 border-b pb-2">1. Select At-Risk Items to Add</h2>
                    {availableAtRiskItems.length > 0 ? (
                        <ul className="space-y-4 max-h-80 overflow-y-auto pr-2">
                            {availableAtRiskItems.map(item => (
                                <li key={item.inventoryItemId} className="p-4 border bg-gray-50 rounded-lg shadow-sm flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                                    <div className="flex-grow">
                                        <span className="font-medium text-gray-800">{item.productName}</span>
                                        <span className="text-xs text-gray-500 ml-1">({item.productId})</span>
                                        <p className="text-sm text-gray-600">
                                            Available: <span className="font-semibold">{item.quantity}</span> {item.unit} • Expires: {new Date(item.expiryDate).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <div className="flex items-center mt-2 sm:mt-0 flex-shrink-0">
                                        <input
                                            type="number"
                                            min="0"
                                            // max={item.quantity} // Max is good for UX but final validation is key
                                            value={itemQuantitiesInForm[item.inventoryItemId] || ''}
                                            onChange={(e) => handleItemQuantityChange(item.inventoryItemId, e.target.value, item.quantity)}
                                            placeholder="Qty"
                                            className="w-20 px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:ring-green-500 focus:border-green-500"
                                        />
                                        <Button
                                            type="button"
                                            onClick={() => handleAddItemToSelectedList(item)}
                                            size="sm"
                                            className="ml-2"
                                            variant="secondary"
                                        >
                                            Add
                                        </Button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-gray-500 italic py-4">No at-risk items passed or available to add.</p>
                    )}
                </section>

                <section>
                    <h2 className="text-xl font-semibold mb-4 text-gray-700 border-b pb-2">2. Current Crate Contents</h2>
                    {selectedItemsForCrate.length > 0 ? (
                        <ul className="space-y-3 border p-4 rounded-md bg-green-50 shadow-inner">
                            {selectedItemsForCrate.map((item, index) => (
                                <li key={`${item.productId}-${index}`} className="p-3 border-b border-green-200 flex justify-between items-center text-sm">
                                    <div>
                                        <span className="font-medium text-green-800">{item.name}</span>
                                        <span className="text-gray-600"> (Qty: {item.quantity})</span>
                                    </div>
                                    <Button
                                        type="button"
                                        onClick={() => handleRemoveItemFromSelectedList(item.productId)}
                                        variant="ghost"
                                        size="xs"
                                        className="text-red-500 hover:text-red-700"
                                    >
                                        Remove
                                    </Button>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-gray-500 italic py-4">No items added to the crate yet.</p>
                    )}
                </section>

                <section className="space-y-6">
                    <h2 className="text-xl font-semibold mb-4 text-gray-700 border-b pb-2">3. Set Crate Details</h2>
                    <div>
                        <label htmlFor="cratePrice" className="block text-sm font-medium text-gray-700 mb-1">
                            Total Crate Price ($)
                        </label>
                        <input
                            type="number"
                            id="cratePrice"
                            value={cratePrice}
                            onChange={(e) => setCratePrice(e.target.value)}
                            placeholder="e.g., 10.50"
                            step="0.01"
                            min="0.01"
                            required
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                        />
                    </div>
                    <div>
                        <label htmlFor="pickupWindow" className="block text-sm font-medium text-gray-700 mb-1">
                            Pickup Window
                        </label>
                        <input
                            type="text"
                            id="pickupWindow"
                            value={pickupWindow}
                            onChange={(e) => setPickupWindow(e.target.value)}
                            placeholder="e.g., Today 2 PM - 5 PM"
                            required
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                        />
                    </div>
                </section>

                <div className="pt-6">
                    <Button
                        type="submit"
                        variant="primary"
                        size="lg"
                        isLoading={isLoading}
                        disabled={isLoading || selectedItemsForCrate.length === 0}
                        className="w-full"
                    >
                        Create Surplus Crate
                    </Button>
                </div>
            </form>
        </div>
    );
};

export default CreateCratePage;