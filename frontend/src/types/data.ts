 

// frontend/src/types/data.ts
export interface Product {
productId: string;
name: string;
category: string;
typicalShelfLifeDays: number;
unit: string;
}

 export interface InventoryItem {
   inventoryItemId: string;
   productId: string;
   storeId: string;
   quantity: number;
   purchaseDate: string;
   expiryDate: string;
   status: "fresh" | "nearingExpiry" | "atRisk" | "expired";
   productName: string;
   unit:string;
 }

 export interface SurplusCrateItem {
   productId: string;
   name: string;
   quantity: number;
 }

 export interface SurplusCrate {
   crateId: string;
   storeId: string;
   items: SurplusCrateItem[];
   listingPrice: number;
   pickupWindow: string;
   status: "listed" | "offerReceived" | "sold" | "expired" | "donated";
   listedAt: string;
   soldToBusinessId?: string; // Optional: ID of the business that bought it
   finalPrice?: number;      // Optional: The price it was sold for
 }

 export interface LocalBusiness {
   businessId: string;
   name: string;
   type: string; // e.g., "restaurant", "pharmacy", "shelter"
   address: string;
   lat: number;
   lng: number;
   preferences: string[]; // Product categories they prefer
 }

 export interface Offer {
   offerId: string;
   businessId: string; // ID of the business making the offer
   offerPrice: number;
   status: "pending" | "accepted" | "rejected";
   offeredAt: string;
 }

 // Payloads for creating new items (omit auto-generated fields)
 export type InventoryItemCreatePayload = Omit<InventoryItem, 'inventoryItemId' | 'expiryDate' | 'status' | 'productName'>;
 export type SurplusCrateCreatePayload = Omit<SurplusCrate, 'crateId' | 'status' | 'listedAt' | 'soldToBusinessId' | 'finalPrice'>;
 export type LocalBusinessCreatePayload = Omit<LocalBusiness, 'businessId'>;
 export type OfferCreatePayload = Omit<Offer, 'offerId' | 'status' | 'offeredAt'>;
 