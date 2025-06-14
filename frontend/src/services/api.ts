// frontend/src/services/api.ts
import axios from 'axios';
import {
Product, InventoryItem, SurplusCrate, LocalBusiness, Offer,
InventoryItemCreatePayload, SurplusCrateCreatePayload, LocalBusinessCreatePayload, OfferCreatePayload
} from '../types/data';
const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000/api'; // Ensure /api if your backend routes are prefixed

 const apiClient = axios.create({
   baseURL: API_BASE_URL,
 });

 // Products
 export const fetchProducts = () => apiClient.get<Product[]>('/products');

 // Inventory
 export const addInventoryItem = (data: InventoryItemCreatePayload) =>
   apiClient.post<InventoryItem>('/inventory_items', data);

 export const fetchAtRiskInventory = (storeId: string) =>
   apiClient.get<InventoryItem[]>(`/inventory_items/store/${storeId}/at-risk`);

 // Surplus Crates
 export const createSurplusCrate = (data: SurplusCrateCreatePayload) =>
   apiClient.post<SurplusCrate>('/surplus_crates', data);

 export const fetchStoreSurplusCrates = (storeId: string) => // For retailer view of their own crates
   apiClient.get<SurplusCrate[]>(`/surplus_crates/store/${storeId}`);

 export const fetchAvailableSurplusCrates = () => // For local business marketplace
   apiClient.get<SurplusCrate[]>('/surplus_crates/available');

 // Local Businesses
 export const addLocalBusiness = (data: LocalBusinessCreatePayload) => // For admin or testing
   apiClient.post<LocalBusiness>('/local_businesses', data);

 export const fetchLocalBusinesses = () => // For map markers
   apiClient.get<LocalBusiness[]>('/local_businesses');

 // Offers
 export const makeOfferOnCrate = (crateId: string, data: OfferCreatePayload) =>
   apiClient.post<Offer>(`/surplus_crates/${crateId}/offers`, data);

 export const fetchOffersForCrate = (crateId: string) =>
   apiClient.get<Offer[]>(`/surplus_crates/${crateId}/offers`);

 export const respondToOffer = (crateId: string, offerId: string, responseStatus: "accepted" | "rejected") =>
   apiClient.put<Offer>(`/surplus_crates/${crateId}/offers/${offerId}/respond?response_status=${responseStatus}`);